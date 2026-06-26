import { db, now } from "./db";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

type ZoAutomation = {
  id: string;
  title: string;
  category?: string | null;
  delivery_method?: string | null;
  schedule_summary?: string | null;
  next_run?: string | null;
  active?: boolean | number | null;
  instruction_summary?: string | null;
};

type NormalizedAutomation = {
  id: string;
  title: string;
  category: string | null;
  delivery_method: string | null;
  schedule_summary: string | null;
  next_run: string | null;
  active: boolean | null;
  instruction_summary: string | null;
};

type ZoAskResponse = {
  output?: unknown;
};

function extractJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Zo API returned no JSON payload");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function normalizeAutomation(input: ZoAutomation): NormalizedAutomation {
  return {
    id: String(input.id || "").trim(),
    title: String(input.title || "").trim(),
    category: input.category ? String(input.category) : null,
    delivery_method: input.delivery_method ? String(input.delivery_method) : null,
    schedule_summary: input.schedule_summary ? String(input.schedule_summary) : null,
    next_run: input.next_run ? String(input.next_run) : null,
    active: input.active === null || input.active === undefined ? null : Boolean(input.active),
    instruction_summary: input.instruction_summary ? String(input.instruction_summary) : null,
  };
}

async function fetchAutomationsFromZo(): Promise<NormalizedAutomation[]> {
  const token = process.env.ZO_CLIENT_IDENTITY_TOKEN;
  if (!token) {
    throw new Error("ZO_CLIENT_IDENTITY_TOKEN is not available");
  }

  const script = `
import json
import os
import urllib.request

prompt = """Use your built-in automation listing tools to inspect the user's current Zo automations.
Do not infer or invent anything.
Call the automation listing tool exactly once.
Return ONLY one JSON object.
Return an automations array.
For each item include these fields when available:
id, title, active, result_delivery_method, rrule, next_run, model.
If a field is unavailable, omit it."""

request = urllib.request.Request(
    "https://api.zo.computer/zo/ask",
    headers={
        "authorization": os.environ["ZO_CLIENT_IDENTITY_TOKEN"],
        "content-type": "application/json",
        "accept": "application/json",
    },
    data=json.dumps({
        "model_name": "byok:a6fbd334-a425-4c8b-bd11-6777fb2b25bd",
        "input": prompt
    }).encode("utf-8"),
    method="POST",
)
with urllib.request.urlopen(request, timeout=180) as response:
    print(response.read().decode("utf-8"))
`;

  const proc = Bun.spawn(["python3", "-u", "-c", script], {
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `automation sync subprocess failed with exit ${exitCode}`);
  }

  const data = JSON.parse(stdout) as ZoAskResponse;
  const parsed = typeof data.output === "string"
    ? extractJsonObject(data.output)
    : (data.output as Record<string, unknown> ?? {});
  const automations = Array.isArray(parsed.automations) ? (parsed.automations as ZoAutomation[]) : [];

  return automations
    .map((item) => normalizeAutomation({
      ...item,
      delivery_method: item.delivery_method ?? (item as any).result_delivery_method,
      schedule_summary: item.schedule_summary ?? (item as any).rrule,
      category: item.category ?? (item as any).model,
    }))
    .filter((item) => item.id && item.title);
}

export async function syncAutomationsFromZo() {
  const incoming = await fetchAutomationsFromZo();
  if (incoming.length === 0) {
    throw new Error("Zo automation sync returned zero automations; keeping existing cache");
  }

  const existingRows = db.prepare("SELECT id, user_notes FROM zo_automations").all() as Array<{ id: string; user_notes: string | null }>;
  const existingCount = existingRows.length;
  const completeEnoughToRemove = incoming.length >= existingCount;

  const existingNotes = new Map(
    existingRows.map((row) => [row.id, row.user_notes])
  );

  const upsert = db.prepare(`
    INSERT INTO zo_automations
      (id, title, category, delivery_method, schedule_summary, next_run, active, instruction_summary, user_notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      category=COALESCE(excluded.category, zo_automations.category),
      delivery_method=COALESCE(excluded.delivery_method, zo_automations.delivery_method),
      schedule_summary=COALESCE(excluded.schedule_summary, zo_automations.schedule_summary),
      next_run=COALESCE(excluded.next_run, zo_automations.next_run),
      active=COALESCE(excluded.active, zo_automations.active),
      instruction_summary=COALESCE(excluded.instruction_summary, zo_automations.instruction_summary),
      user_notes=COALESCE(zo_automations.user_notes, excluded.user_notes)
  `);

  const apply = db.transaction((rows: NormalizedAutomation[]) => {
    const ids = new Set(rows.map((row) => row.id));
    for (const row of rows) {
      upsert.run(
        row.id,
        row.title,
        row.category,
        row.delivery_method,
        row.schedule_summary,
        row.next_run,
        row.active === null ? null : row.active ? 1 : 0,
        row.instruction_summary,
        existingNotes.get(row.id) ?? null,
        now()
      );
    }

    const currentIds = db.prepare("SELECT id FROM zo_automations").all() as Array<{ id: string }>;
    const remove = db.prepare("DELETE FROM zo_automations WHERE id=?");
    let removed = 0;
    if (completeEnoughToRemove) {
      for (const row of currentIds) {
        if (!ids.has(row.id)) {
          remove.run(row.id);
          removed += 1;
        }
      }
    }
    return removed;
  });

  const removed = apply(incoming);
  return {
    count: incoming.length,
    removed,
    partial: !completeEnoughToRemove,
    existingCount,
  };
}

export function syncAutomationsFromSnapshot() {
  const snapshotPath = join(import.meta.dir, "../data/automations-snapshot.json");
  if (!existsSync(snapshotPath)) {
    throw new Error("No automations snapshot found");
  }

  const incoming = (JSON.parse(readFileSync(snapshotPath, "utf-8")) as ZoAutomation[])
    .map(normalizeAutomation)
    .filter((item) => item.id && item.title);

  if (incoming.length === 0) {
    throw new Error("Automation snapshot contains zero automations");
  }

  const existingNotes = new Map(
    (db.prepare("SELECT id, user_notes FROM zo_automations").all() as Array<{ id: string; user_notes: string | null }>)
      .map((row) => [row.id, row.user_notes])
  );

  const upsert = db.prepare(`
    INSERT INTO zo_automations
      (id, title, category, delivery_method, schedule_summary, next_run, active, instruction_summary, user_notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      category=excluded.category,
      delivery_method=excluded.delivery_method,
      schedule_summary=excluded.schedule_summary,
      next_run=excluded.next_run,
      active=excluded.active,
      instruction_summary=excluded.instruction_summary,
      user_notes=COALESCE(zo_automations.user_notes, excluded.user_notes)
  `);

  const apply = db.transaction((rows: NormalizedAutomation[]) => {
    for (const row of rows) {
      upsert.run(
        row.id,
        row.title,
        row.category ?? "General",
        row.delivery_method,
        row.schedule_summary,
        row.next_run,
        row.active === null ? 1 : row.active ? 1 : 0,
        row.instruction_summary,
        existingNotes.get(row.id) ?? null,
        now()
      );
    }
  });

  apply(incoming);
  return { count: incoming.length, removed: 0, partial: false, existingCount: incoming.length, source: "snapshot" };
}
