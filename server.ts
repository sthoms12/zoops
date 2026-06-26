import { serveStatic } from "hono/bun";
import { Hono } from "hono";
import config from "./zosite.json";
import { db, initDb, generateId, now } from "./backend-lib/db";
import { runDiscovery, persistDiscovery, detectServicesFromLogs, syncZoSitesToServices, syncSpaceRoutesFromSnapshot } from "./backend-lib/discovery";
import { runHealthCheck } from "./backend-lib/health";
import { seedIfEmpty } from "./backend-lib/seed";
import { syncAutomationsFromSnapshot, syncAutomationsFromZo } from "./backend-lib/automations";
import { readdirSync, existsSync } from "fs";
import { getRuntimePort } from "./backend-lib/settings";

type Mode = "development" | "production";
const mode: Mode = process.env.NODE_ENV === "production" ? "production" : "development";

const hasWorkflowsTable = () => {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='workflows'").get() as { name?: string } | null;
  return !!row?.name;
};

let automationSyncState: {
  syncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  lastCount: number | null;
  lastRemoved: number | null;
  lastPartial: boolean;
  lastExistingCount: number | null;
} = {
  syncing: false,
  lastSyncAt: null,
  lastError: null,
  lastCount: null,
  lastRemoved: null,
  lastPartial: false,
  lastExistingCount: null,
};

function queueAutomationSync() {
  if (automationSyncState.syncing) return false;
  automationSyncState.syncing = true;
  automationSyncState.lastError = null;

  void syncAutomationsFromZo()
    .then((result) => {
      automationSyncState.lastSyncAt = now();
      automationSyncState.lastCount = result.count;
      automationSyncState.lastRemoved = result.removed;
      automationSyncState.lastPartial = result.partial;
      automationSyncState.lastExistingCount = result.existingCount;
      const partialNote = result.partial ? " partial response; kept existing cache rows" : "";
      console.log(`ZoOps: synced ${result.count} automations (${result.removed} removed)${partialNote}`);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      automationSyncState.lastError = message;
      console.error("Automation sync error:", error);
    })
    .finally(() => {
      automationSyncState.syncing = false;
    });

  return true;
}

function upsertWorkflow(workflowId: string | null | undefined, workflowName: string | null | undefined) {
  if (!workflowId || !workflowName || !hasWorkflowsTable()) return;
  db.prepare(`
    INSERT INTO workflows (id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      updated_at=excluded.updated_at
  `).run(workflowId, workflowName, now(), now());
}

// ── PROCESS STABILITY ────────────────────────────────────────────
// Log unexpected errors and stay alive rather than crashing the process.
function persistEvent(type: string, source: string, message: string, stack?: string) {
  try {
    db.prepare("INSERT INTO app_events (id,type,source,message,stack,timestamp) VALUES (?,?,?,?,?,datetime('now'))")
      .run(generateId(), type, source, message, stack ?? null);
  } catch { /* DB unavailable — don't throw recursively */ }
}

process.on("uncaughtException", (err) => {
  console.error("[ZoOps] uncaughtException:", err);
  persistEvent("uncaught_exception", "backend", err.message, err.stack);
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  console.error("[ZoOps] unhandledRejection:", reason);
  persistEvent("unhandled_rejection", "backend", msg, stack);
});

// Initialize database
initDb();
seedIfEmpty();

// Defer startup scan so the server accepts requests immediately
setTimeout(() => {
  try {
    const items = runDiscovery();
    persistDiscovery(items);
    console.log(`ZoOps: discovered ${items.length} local items`);
    const sync = syncZoSitesToServices();
    if (sync.added.length > 0) console.log(`ZoOps: auto-synced new Zo Sites: ${sync.added.join(", ")}`);
    const spaceSync = syncSpaceRoutesFromSnapshot();
    if (spaceSync.added.length > 0) console.log(`ZoOps: synced space routes: ${spaceSync.added.join(", ")}`);
  } catch (e) {
    console.error("Discovery scan error:", e);
  }
}, 0);

setTimeout(() => {
  try {
    const result = syncAutomationsFromSnapshot();
    automationSyncState.lastSyncAt = now();
    automationSyncState.lastCount = result.count;
    automationSyncState.lastRemoved = 0;
    automationSyncState.lastPartial = false;
    automationSyncState.lastExistingCount = result.count;
    console.log(`ZoOps: loaded ${result.count} automations from local snapshot`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    automationSyncState.lastError = message;
    console.error("Automation snapshot load error:", error);
  }
}, 0);

// Sync automations from Zo API every 30 minutes so the list stays current
// without requiring manual refresh.
setInterval(() => queueAutomationSync(), 30 * 60 * 1000);

// Re-scan every 5 minutes so new/removed services and discovered items appear automatically.
setInterval(() => {
  try {
    const items = runDiscovery();
    persistDiscovery(items);
    syncZoSitesToServices();
    syncSpaceRoutesFromSnapshot();
  } catch (e) {
    console.error("Background scan error:", e);
  }
}, 5 * 60 * 1000);

// Generate health snapshot every 5 minutes so the health page stays current.
setInterval(() => {
  try { runHealthCheck(); } catch (e) { console.error("Background health error:", e); }
}, 5 * 60 * 1000);

const app = new Hono();

app.onError((err, c) => {
  console.error(`[ZoOps] Unhandled route error ${c.req.method} ${c.req.path}:`, err);
  persistEvent("route_error", "backend", `${c.req.method} ${c.req.path}: ${err.message}`, err.stack);
  return c.json({ error: "Internal server error", path: c.req.path }, 500);
});

// ── DASHBOARD ─────────────────────────────────────────────────────
app.get("/api/dashboard", c => {
  const liveSites = (db.prepare("SELECT COUNT(*) as c FROM services WHERE type IN ('zo-site','zo-space','space-page') OR (type='service' AND endpoint IS NOT NULL)").get() as { c: number })?.c ?? 0;
  const latestHealth = db.prepare("SELECT * FROM health_snapshots ORDER BY timestamp DESC LIMIT 1").get() as any;
  const discoveredCount = (db.prepare("SELECT COUNT(*) as c FROM discovered_items").get() as { c: number })?.c ?? 0;
  const automationsCount = (db.prepare("SELECT COUNT(*) as c FROM zo_automations WHERE active=1").get() as { c: number })?.c ?? 0;
  const recentAutomations = db.prepare("SELECT id, title, next_run, active, schedule_summary FROM zo_automations ORDER BY next_run ASC LIMIT 6").all() as any[];

  return c.json({
    stats: {
      automationsCount,
      liveSites,
      discoveredCount,
    },
    healthWarnings: [],
    recentAutomations,
    latestHealth,
    lastScanAt: (db.prepare("SELECT last_seen_at FROM discovered_items ORDER BY last_seen_at DESC LIMIT 1").get() as any)?.last_seen_at ?? null,
  });
});

// ── DISCOVERY ────────────────────────────────────────────────────
app.get("/api/discovery", c => {
  const items = db.prepare("SELECT * FROM discovered_items ORDER BY type, name").all();
  return c.json(items.map((i: any) => ({ ...i, metadata: JSON.parse(i.metadata || "{}") })));
});

app.post("/api/discovery/scan", async c => {
  try {
    const previous = db.prepare("SELECT type, name, path FROM discovered_items").all() as any[];
    const prevPaths = new Set(previous.map((i: any) => i.path));
    const items = runDiscovery();
    const newPaths = new Set(items.map(i => i.path));
    const added = items.filter(i => !prevPaths.has(i.path)).map(i => ({ type: i.type, name: i.name, path: i.path }));
    const removed = previous.filter((i: any) => !newPaths.has(i.path)).map((i: any) => ({ type: i.type, name: i.name, path: i.path }));
    persistDiscovery(items);
    if (previous.length > 0) {
      db.prepare(`INSERT INTO scan_deltas (id,scan_at,total_count,added_count,removed_count,items_added,items_removed)
        VALUES (?,datetime('now'),?,?,?,?,?)`)
        .run(generateId(), items.length, added.length, removed.length,
          JSON.stringify(added.slice(0, 50)), JSON.stringify(removed.slice(0, 50)));
    }
    let automationsLoaded = 0;
    try {
      automationsLoaded = syncAutomationsFromSnapshot().count;
    } catch (automationError) {
      const message = automationError instanceof Error ? automationError.message : String(automationError);
      automationSyncState.lastError = message;
    }

    return c.json({
      count: items.length,
      added: added.length,
      removed: removed.length,
      items: items.slice(0, 5),
      automationsLoaded,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── SITES SYNC ───────────────────────────────────────────────────
app.post("/api/sites/sync", c => {
  try {
    const result = syncZoSitesToServices();
    const spaceResult = syncSpaceRoutesFromSnapshot();
    return c.json({ ok: true, added: [...result.added, ...spaceResult.added], total: result.total + spaceResult.total });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── SERVICES ─────────────────────────────────────────────────────
app.get("/api/services", c => c.json(db.prepare("SELECT * FROM services ORDER BY name").all()));

app.post("/api/services", async c => {
  const body = await c.req.json();
  const svc = { id: generateId(), ...body, created_at: now(), updated_at: now(), last_checked_at: now() };
  db.prepare(`INSERT INTO services (id,name,path,type,status,endpoint,port,last_checked_at,notes,is_auto_detected,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(svc.id, svc.name, svc.path || null, svc.type || "unknown",
    svc.status || "unknown", svc.endpoint || null, svc.port || null, svc.last_checked_at,
    svc.notes || null, 0, svc.created_at, svc.updated_at);
  return c.json(svc, 201);
});

app.put("/api/services/:id", async c => {
  const id = c.req.param("id");
  const body = await c.req.json();
  db.prepare(`UPDATE services SET name=?,path=?,type=?,status=?,endpoint=?,port=?,notes=?,updated_at=? WHERE id=?`)
    .run(body.name, body.path || null, body.type || "unknown", body.status || "unknown",
      body.endpoint || null, body.port || null, body.notes || null, now(), id);
  return c.json({ id, ...body });
});

app.delete("/api/services/:id", c => {
  db.prepare("DELETE FROM services WHERE id=?").run(c.req.param("id"));
  return c.json({ ok: true });
});

app.post("/api/services/:id/check", async c => {
  const id = c.req.param("id");
  const svc = db.prepare("SELECT * FROM services WHERE id=?").get(id) as any;
  if (!svc) return c.json({ error: "Not found" }, 404);

  let status = "unknown";
  let note = "";
  if (svc.endpoint) {
    try {
      const res = await fetch(svc.endpoint, { signal: AbortSignal.timeout(5000) });
      status = res.ok ? "healthy" : "warning";
      note = `HTTP ${res.status}`;
    } catch (e: any) {
      status = "failed";
      note = e.message;
    }
  } else if (svc.port) {
    try {
      const res = await fetch(`http://localhost:${svc.port}`, { signal: AbortSignal.timeout(3000) });
      status = res.ok ? "healthy" : "warning";
      note = `localhost:${svc.port} → HTTP ${res.status}`;
    } catch {
      status = "failed";
      note = `localhost:${svc.port} unreachable`;
    }
  } else {
    note = "No endpoint or port configured";
  }

  db.prepare("UPDATE services SET status=?,last_checked_at=?,notes=?,updated_at=? WHERE id=?")
    .run(status, now(), note, now(), id);
  return c.json({ id, status, note, checked_at: now() });
});

app.post("/api/services/:id/restart", async c => {
  const id = c.req.param("id");
  const svc = db.prepare("SELECT * FROM services WHERE id=?").get(id) as any;
  if (!svc) return c.json({ error: "Not found" }, 404);
  if (!svc.port) return c.json({ error: "No port configured — cannot restart" }, 400);
  try {
    Bun.spawnSync(["sh", "-c", `kill $(lsof -ti :${Number(svc.port)} 2>/dev/null) 2>/dev/null; true`]);
    db.prepare("UPDATE services SET status='unknown', notes='Restarting…', updated_at=? WHERE id=?").run(now(), id);
    return c.json({ ok: true, port: svc.port });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── NEEDS REVIEW ─────────────────────────────────────────────────
app.get("/api/reviews", c => {
  const items = db.prepare("SELECT * FROM review_items WHERE status='pending' ORDER BY priority DESC, created_at ASC").all();
  return c.json({ reviewItems: items });
});

app.patch("/api/reviews/:id", async c => {
  const id = c.req.param("id");
  const body = await c.req.json();
  db.prepare("UPDATE review_items SET status=?,notes=?,reviewed_at=? WHERE id=?")
    .run(body.status || "pending", body.notes || null, body.status !== "pending" ? now() : null, id);
  return c.json({ id, ...body });
});

app.post("/api/reviews", async c => {
  const body = await c.req.json();
  const id = generateId();
  db.prepare("INSERT INTO review_items (id,type,ref_id,title,description,status,priority,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(id, body.type || "general", body.ref_id || null, body.title, body.description || null,
      "pending", body.priority || "normal", body.notes || null, now());
  return c.json({ id, ...body }, 201);
});

// ── AUTOMATIONS (Zo Agents) ─────────────────────────────────────
app.get("/api/automations", c => {
  const automations = db.prepare("SELECT * FROM zo_automations ORDER BY next_run ASC").all() as any[];
  return c.json(automations);
});

app.get("/api/automations/status", c => {
  const count = (db.prepare("SELECT COUNT(*) as c FROM zo_automations").get() as { c: number } | null)?.c ?? 0;
  return c.json({ ...automationSyncState, count });
});

app.post("/api/automations/refresh", async c => {
  try {
    const result = syncAutomationsFromSnapshot();
    automationSyncState.lastSyncAt = now();
    automationSyncState.lastError = null;
    automationSyncState.lastCount = result.count;
    automationSyncState.lastRemoved = 0;
    automationSyncState.lastPartial = false;
    automationSyncState.lastExistingCount = result.count;
    return c.json({ ok: true, started: false, completed: true, ...result });
  } catch (e: any) {
    automationSyncState.lastError = e.message;
    return c.json({ error: e.message }, 500);
  }
});

app.post("/api/automations/deep-refresh", async c => {
  return c.json({ ok: true, started: queueAutomationSync() });
});

// Calendar: future scheduled automations
app.get("/api/automations/calendar", c => {
  const automations = db.prepare("SELECT * FROM zo_automations ORDER BY title ASC").all() as any[];
  return c.json({ automations });
});

app.get("/api/automations/:id", c => {
  const a = db.prepare("SELECT * FROM zo_automations WHERE id=?").get(c.req.param("id"));
  if (!a) return c.json({ error: "Not found" }, 404);
  return c.json(a);
});

app.get("/api/automations/:id/history", c => {
  const automation = db.prepare("SELECT * FROM zo_automations WHERE id=?").get(c.req.param("id")) as any;
  if (!automation) return c.json({ error: "Not found" }, 404);
  return c.json({ automation });
});

// Update user_notes for an automation
app.patch("/api/automations/:id", async c => {
  const id = c.req.param("id");
  const body = await c.req.json();
  db.prepare("UPDATE zo_automations SET user_notes=? WHERE id=?").run(body.user_notes ?? null, id);
  const updated = db.prepare("SELECT * FROM zo_automations WHERE id=?").get(id);
  return c.json(updated);
});

app.post("/api/automations/:id/run", async c => {
  const automation = db.prepare("SELECT title FROM zo_automations WHERE id=?").get(c.req.param("id")) as any;
  if (!automation) return c.json({ error: "Not found" }, 404);
  return c.json({
    error: "no_trigger_api",
    title: automation.title,
    zo_url: `${process.env.ZO_BASE_URL || "https://your-handle.zo.computer"}/?t=automations`,
  }, 501);
});


// ── SKILLS & PERSONAS ────────────────────────────────────────────
app.get("/api/skills-personas", c => c.json(db.prepare("SELECT * FROM skills_personas ORDER BY type, name").all()));

app.post("/api/skills-personas", async c => {
  const body = await c.req.json();
  const id = generateId();
  db.prepare(`INSERT INTO skills_personas (id,type,name,path,purpose,notes,related_workflow,last_reviewed_at,is_auto_detected,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,0,?,?)`).run(
    id, body.type, body.name, body.path || null, body.purpose || null,
    body.notes || null, body.related_workflow || null, body.last_reviewed_at || null, now(), now());
  return c.json({ id, ...body }, 201);
});

app.put("/api/skills-personas/:id", async c => {
  const id = c.req.param("id");
  const body = await c.req.json();
  db.prepare(`UPDATE skills_personas SET type=?,name=?,path=?,purpose=?,notes=?,related_workflow=?,last_reviewed_at=?,updated_at=? WHERE id=?`)
    .run(body.type, body.name, body.path || null, body.purpose || null, body.notes || null,
      body.related_workflow || null, body.last_reviewed_at || null, now(), id);
  return c.json({ id, ...body });
});

app.delete("/api/skills-personas/:id", c => {
  db.prepare("DELETE FROM skills_personas WHERE id=?").run(c.req.param("id"));
  return c.json({ ok: true });
});

// ── AUTOMATIONS ──────────────────────────────────────────────────
// (AI sync removed — automations are read from local SQLite cache only)

// ── HEALTH ───────────────────────────────────────────────────────
app.get("/api/health", c => {
  try {
    const snapshot = runHealthCheck();
    return c.json(snapshot);
  } catch (e: any) {
    return c.json({ error: e.message, overall_status: "failed" }, 500);
  }
});

app.get("/api/health/history", c => {
  const history = db.prepare("SELECT * FROM health_snapshots ORDER BY timestamp DESC LIMIT 30").all() as any[];
  return c.json(history.map(h => ({ ...h, details: JSON.parse(h.details || "{}") })));
});

// ── SETTINGS ─────────────────────────────────────────────────────
app.get("/api/settings", c => {
  const rows = db.prepare("SELECT key,value FROM settings").all() as any[];
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  return c.json(settings);
});

app.put("/api/settings", async c => {
  const body = await c.req.json();
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,?)");
  for (const [k, v] of Object.entries(body)) {
    upsert.run(k, String(v), now());
  }
  return c.json({ ok: true });
});

// ── APP EVENTS ───────────────────────────────────────────────────
app.post("/api/errors", async c => {
  try {
    const body = await c.req.json();
    persistEvent(body.type || "frontend_error", "frontend", body.message || "unknown", body.stack);
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: true }); // Never 500 the error reporter
  }
});

app.get("/api/events", c => {
  const limit = parseInt(c.req.query("limit") ?? "100");
  const type = c.req.query("type");
  let query = "SELECT * FROM app_events WHERE 1=1";
  const params: any[] = [];
  if (type) { query += " AND type=?"; params.push(type); }
  query += " ORDER BY timestamp DESC LIMIT ?";
  params.push(Math.min(limit, 500));
  const events = db.prepare(query).all(...params);
  return c.json(events);
});

// ── CHANGELOG (scan deltas) ──────────────────────────────────────
app.get("/api/changelog", c => {
  const rows = db.prepare("SELECT * FROM scan_deltas ORDER BY scan_at DESC LIMIT 50").all() as any[];
  return c.json(rows.map(r => ({
    ...r,
    items_added: JSON.parse(r.items_added || "[]"),
    items_removed: JSON.parse(r.items_removed || "[]"),
  })));
});

// ── FEED (intelligence output) ────────────────────────────────────
app.get("/api/feed", c => {
  return c.json({ runs: [], workflows: [] });
});

// ── LOGS ──────────────────────────────────────────────────────────
app.get("/api/logs/list", c => {
  try {
    const files = readdirSync("/dev/shm")
      .filter(f => f.endsWith(".log"))
      .sort()
      .map(f => ({ name: f.replace(".log", ""), file: f }));
    return c.json(files);
  } catch {
    return c.json([]);
  }
});

app.get("/api/logs/:name", async c => {
  const raw = c.req.param("name");
  const safeName = raw.replace(/[^a-zA-Z0-9._-]/g, "");
  const lines = Math.min(parseInt(c.req.query("lines") ?? "300"), 1000);
  const path = `/dev/shm/${safeName}.log`;
  if (!existsSync(path)) return c.json({ lines: [], error: "Log file not found" });
  try {
    const content = await Bun.file(path).text();
    const all = content.split("\n").filter(Boolean);
    const tail = all.slice(-lines);
    return c.json({ lines: tail, total: all.length });
  } catch (e: any) {
    return c.json({ lines: [], error: e.message });
  }
});

// ── EXPLORER (SQLite) ─────────────────────────────────────────────
app.get("/api/explorer/databases", c => {
  const dbs = db.prepare(
    "SELECT name, path, description, metadata FROM discovered_items WHERE type='database' ORDER BY name"
  ).all() as any[];
  return c.json(dbs.map(d => ({ ...d, metadata: JSON.parse(d.metadata || "{}") })));
});

app.post("/api/explorer/tables", async c => {
  const { dbPath } = await c.req.json();
  if (!dbPath || !/^\/home\/workspace\/.+\.(db|sqlite|sqlite3)$/.test(dbPath)) {
    return c.json({ error: "Invalid database path" }, 400);
  }
  if (!existsSync(dbPath)) return c.json({ error: "File not found" }, 404);
  try {
    const { Database } = await import("bun:sqlite");
    const target = new Database(dbPath, { readonly: true });
    const tables = (target.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as any[]).map(t => t.name);
    target.close();
    return c.json({ tables });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.post("/api/explorer/query", async c => {
  const { dbPath, query: sql } = await c.req.json();
  if (!dbPath || !/^\/home\/workspace\/.+\.(db|sqlite|sqlite3)$/.test(dbPath)) {
    return c.json({ error: "Invalid database path" }, 400);
  }
  const trimmed = (sql || "").trim().toUpperCase();
  if (!trimmed.startsWith("SELECT") && !trimmed.startsWith("PRAGMA")) {
    return c.json({ error: "Only SELECT and PRAGMA queries are allowed" }, 400);
  }
  if (!existsSync(dbPath)) return c.json({ error: "File not found" }, 404);
  try {
    const { Database } = await import("bun:sqlite");
    const target = new Database(dbPath, { readonly: true });
    const rows = (target.prepare(sql).all() as any[]).slice(0, 500);
    target.close();
    return c.json({ rows, count: rows.length });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// ── VITE / STATIC ─────────────────────────────────────────────────
async function startServer() {
  const port = getRuntimePort();

  if (mode === "development") {
    // Start Vite's own dev server on port+1, then proxy all non-API traffic to it
    const vitePort = port + 1;
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { port: vitePort, strictPort: true, hmr: false, ws: false },
      appType: "spa",
    });
    await vite.listen();
    console.log(`ZoOps Vite dev server on http://localhost:${vitePort}`);

    app.use("*", async (c, next) => {
      if (c.req.path.startsWith("/api/")) return next();
      // Proxy everything else to Vite
      const viteUrl = `http://localhost:${vitePort}${c.req.raw.url.replace(/^https?:\/\/[^/]+/, "")}`;
      try {
        const headers = new Headers(c.req.raw.headers);
        headers.delete("host");
        const res = await fetch(viteUrl, {
          method: c.req.method,
          headers,
          body: c.req.method !== "GET" && c.req.method !== "HEAD" ? c.req.raw.body : undefined,
          redirect: "manual",
          signal: AbortSignal.timeout(10000),
        });
        return new Response(res.body, {
          status: res.status,
          headers: res.headers,
        });
      } catch (e: any) {
        console.error("Vite proxy error:", e.message);
        return c.text("Dev server error", 502);
      }
    });
  } else {
    app.use("*", serveStatic({ root: "./dist" }));
    app.get("*", async c => {
      const file = Bun.file("./dist/index.html");
      return new Response(file, { headers: { "content-type": "text/html" } });
    });
  }

  Bun.serve({ fetch: app.fetch, port });
  console.log(`ZoOps running on http://localhost:${port} [${mode}]`);
}

startServer();
