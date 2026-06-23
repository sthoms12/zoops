import { serveStatic } from "hono/bun";
import { Hono } from "hono";
import config from "./zosite.json";
import { db, initDb, generateId, now } from "./backend-lib/db";
import { runDiscovery, persistDiscovery, detectServicesFromLogs } from "./backend-lib/discovery";
import { runHealthCheck } from "./backend-lib/health";
import { seedIfEmpty } from "./backend-lib/seed";

type Mode = "development" | "production";
const mode: Mode = process.env.NODE_ENV === "production" ? "production" : "development";

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
  } catch (e) {
    console.error("Discovery scan error:", e);
  }
}, 0);

const app = new Hono();

app.onError((err, c) => {
  console.error(`[ZoOps] Unhandled route error ${c.req.method} ${c.req.path}:`, err);
  persistEvent("route_error", "backend", `${c.req.method} ${c.req.path}: ${err.message}`, err.stack);
  return c.json({ error: "Internal server error", path: c.req.path }, 500);
});

// ── DASHBOARD ─────────────────────────────────────────────────────
app.get("/api/dashboard", c => {
  const workflows = db.prepare("SELECT * FROM workflows").all();
  const runs = db.prepare("SELECT * FROM workflow_runs ORDER BY created_at DESC LIMIT 50").all() as any[];
  const reviewItems = db.prepare("SELECT COUNT(*) as c FROM review_items WHERE status='pending'").get() as { c: number };
  const services = db.prepare("SELECT * FROM services").all() as any[];
  const browserTasks = db.prepare("SELECT * FROM browser_tasks").all() as any[];
  const latestHealth = db.prepare("SELECT * FROM health_snapshots ORDER BY timestamp DESC LIMIT 1").get() as any;
  const discoveredCount = (db.prepare("SELECT COUNT(*) as c FROM discovered_items").get() as { c: number })?.c ?? 0;

  const activeWorkflows = (workflows as any[]).filter(w => w.status === "active").length;
  const staleWorkflows = (workflows as any[]).filter(w => {
    if (w.status !== "active") return false;
    if (!w.last_run_at) return true;
    const daysSince = (Date.now() - new Date(w.last_run_at).getTime()) / 86400000;
    return daysSince > (w.stale_after_days || 7);
  }).length;

  const failedRuns = runs.filter(r => r.status === "failed").length;
  const completedRuns = runs.filter(r => r.status === "completed").length;
  const successRate = runs.length > 0 ? Math.round((completedRuns / runs.length) * 100) : 0;
  const recentRuns = runs.slice(0, 8);

  const healthWarnings: string[] = [];
  if (staleWorkflows > 0) healthWarnings.push(`${staleWorkflows} stale workflow(s)`);
  if (failedRuns > 0) healthWarnings.push(`${failedRuns} failed run(s)`);
  if (reviewItems.c > 0) healthWarnings.push(`${reviewItems.c} item(s) need review`);

  const sessionIssues = (browserTasks as any[]).filter(t => ["login_expired", "needs_2fa", "blocked"].includes(t.session_status)).length;
  if (sessionIssues > 0) healthWarnings.push(`${sessionIssues} browser session issue(s)`);

  return c.json({
    stats: {
      activeWorkflows,
      staleWorkflows,
      failedRuns,
      pendingReviews: reviewItems.c,
      successRate,
      totalRuns: runs.length,
      serviceCount: services.length,
      discoveredCount,
      browserTaskCount: browserTasks.length,
    },
    healthWarnings,
    recentRuns,
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
    const items = runDiscovery();
    persistDiscovery(items);
    return c.json({ count: items.length, items: items.slice(0, 5) });
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

// ── WORKFLOWS ────────────────────────────────────────────────────
app.get("/api/workflows", c => {
  const workflows = db.prepare("SELECT * FROM workflows ORDER BY updated_at DESC").all() as any[];
  return c.json(workflows.map(w => ({
    ...w,
    healthState: computeWorkflowHealth(w),
  })));
});

app.post("/api/workflows", async c => {
  const body = await c.req.json();
  const id = generateId();
  db.prepare(`INSERT INTO workflows (id,name,description,category,prompt,persona,model,expected_output,success_criteria,risk_level,status,stale_after_days,notes,failure_count,success_rate,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?,?)`).run(
    id, body.name, body.description || null, body.category || "General",
    body.prompt || "", body.persona || null, body.model || null,
    body.expected_output || null, body.success_criteria || null,
    body.risk_level || "low", body.status || "active",
    body.stale_after_days || 7, body.notes || null, now(), now());

  if (body.prompt) {
    db.prepare("INSERT INTO prompt_versions (id,workflow_id,version,prompt,change_note,created_at) VALUES (?,?,1,?,?,?)")
      .run(generateId(), id, body.prompt, "Initial version", now());
  }
  return c.json({ id, ...body }, 201);
});

app.get("/api/workflows/:id", c => {
  const id = c.req.param("id");
  const wf = db.prepare("SELECT * FROM workflows WHERE id=?").get(id) as any;
  if (!wf) return c.json({ error: "Not found" }, 404);
  const runs = db.prepare("SELECT * FROM workflow_runs WHERE workflow_id=? ORDER BY created_at DESC LIMIT 20").all(id);
  const promptVersions = db.prepare("SELECT * FROM prompt_versions WHERE workflow_id=? ORDER BY version DESC").all(id);
  return c.json({ ...wf, healthState: computeWorkflowHealth(wf), runs, promptVersions });
});

app.put("/api/workflows/:id", async c => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = db.prepare("SELECT * FROM workflows WHERE id=?").get(id) as any;
  if (!existing) return c.json({ error: "Not found" }, 404);

  db.prepare(`UPDATE workflows SET name=?,description=?,category=?,prompt=?,persona=?,model=?,expected_output=?,success_criteria=?,risk_level=?,status=?,stale_after_days=?,notes=?,updated_at=? WHERE id=?`).run(
    body.name || existing.name, body.description ?? existing.description,
    body.category || existing.category, body.prompt ?? existing.prompt,
    body.persona ?? existing.persona, body.model ?? existing.model,
    body.expected_output ?? existing.expected_output, body.success_criteria ?? existing.success_criteria,
    body.risk_level || existing.risk_level, body.status || existing.status,
    body.stale_after_days ?? existing.stale_after_days, body.notes ?? existing.notes, now(), id);

  if (body.prompt && body.prompt !== existing.prompt) {
    const lastVer = (db.prepare("SELECT MAX(version) as v FROM prompt_versions WHERE workflow_id=?").get(id) as any)?.v ?? 0;
    db.prepare("INSERT INTO prompt_versions (id,workflow_id,version,prompt,change_note,created_at) VALUES (?,?,?,?,?,?)")
      .run(generateId(), id, lastVer + 1, body.prompt, body.changeNote || "Updated", now());
  }
  return c.json({ id, ...body });
});

app.delete("/api/workflows/:id", c => {
  const id = c.req.param("id");
  db.prepare("DELETE FROM workflow_runs WHERE workflow_id=?").run(id);
  db.prepare("DELETE FROM prompt_versions WHERE workflow_id=?").run(id);
  db.prepare("DELETE FROM workflows WHERE id=?").run(id);
  return c.json({ ok: true });
});

function computeWorkflowHealth(w: any): string {
  if (w.status === "archived") return "archived";
  if (w.status === "paused") return "paused";
  if (w.status === "draft") return "draft";
  if (w.failure_count > 2 && w.success_rate < 0.5) return "failing";
  if (!w.last_run_at) return "stale";
  const daysSince = (Date.now() - new Date(w.last_run_at).getTime()) / 86400000;
  if (daysSince > (w.stale_after_days || 7)) return "stale";
  if (w.failure_count > 0) return "needs_review";
  return "healthy";
}

// ── RUNS ─────────────────────────────────────────────────────────
app.get("/api/runs", c => {
  const { workflowId, status, limit = "50" } = c.req.query();
  let query = "SELECT * FROM workflow_runs WHERE 1=1";
  const params: any[] = [];
  if (workflowId) { query += " AND workflow_id=?"; params.push(workflowId); }
  if (status) { query += " AND status=?"; params.push(status); }
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(parseInt(limit));
  return c.json(db.prepare(query).all(...params));
});

app.post("/api/runs", async c => {
  const body = await c.req.json();
  const id = generateId();
  const wf = db.prepare("SELECT name FROM workflows WHERE id=?").get(body.workflow_id) as any;
  const runStatus = body.status || "pending";
  db.prepare(`INSERT INTO workflow_runs (id,workflow_id,workflow_name,input_prompt,output,summary,status,review_status,notes,started_at,completed_at,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, body.workflow_id, wf?.name || body.workflow_name || "Unknown",
    body.input_prompt || null, body.output || null, body.summary || null,
    runStatus, body.review_status || "pending",
    body.notes || null, body.started_at || now(),
    runStatus === "completed" ? now() : null, now());
  return c.json({ id, ...body }, 201);
});

app.get("/api/runs/:id", c => {
  const run = db.prepare("SELECT * FROM workflow_runs WHERE id=?").get(c.req.param("id"));
  if (!run) return c.json({ error: "Not found" }, 404);
  return c.json(run);
});

app.patch("/api/runs/:id", async c => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = db.prepare("SELECT * FROM workflow_runs WHERE id=?").get(id) as any;
  if (!existing) return c.json({ error: "Not found" }, 404);

  const fields: string[] = [];
  const vals: any[] = [];
  const allowed = ["output", "summary", "status", "review_status", "notes", "reviewer_notes", "error", "duration_ms", "completed_at"];
  for (const f of allowed) {
    if (f in body) { fields.push(`${f}=?`); vals.push(body[f]); }
  }
  if (body.status === "completed" && !existing.completed_at) {
    fields.push("completed_at=?"); vals.push(now());
  }
  if (body.review_status && body.review_status !== "pending") {
    fields.push("reviewed_at=?"); vals.push(now());
  }
  if (fields.length > 0) {
    db.prepare(`UPDATE workflow_runs SET ${fields.join(",")} WHERE id=?`).run(...vals, id);
  }

  // Auto-update workflow stats
  if (body.status === "completed" || body.status === "failed") {
    const runs = db.prepare("SELECT status FROM workflow_runs WHERE workflow_id=?").all(existing.workflow_id) as any[];
    const completed = runs.filter(r => r.status === "completed").length;
    const failed = runs.filter(r => r.status === "failed").length;
    const rate = runs.length > 0 ? completed / runs.length : 0;
    const lastRunAt = body.status === "completed" ? now() : existing.last_run_at;
    db.prepare("UPDATE workflows SET failure_count=?,success_rate=?,last_run_at=?,last_success_at=?,updated_at=? WHERE id=?")
      .run(failed, rate, now(), body.status === "completed" ? now() : existing.last_success_at, now(), existing.workflow_id);
  }

  return c.json({ id, ...body });
});

// ── NEEDS REVIEW ─────────────────────────────────────────────────
app.get("/api/reviews", c => {
  const items = db.prepare("SELECT * FROM review_items WHERE status='pending' ORDER BY priority DESC, created_at ASC").all();
  // Also include failed/needs_review runs
  const runItems = db.prepare("SELECT * FROM workflow_runs WHERE status IN ('needs_review','failed') AND (review_status='pending' OR review_status IS NULL) ORDER BY created_at DESC").all() as any[];
  const btItems = db.prepare("SELECT * FROM browser_tasks WHERE session_status IN ('login_expired','needs_2fa','blocked') ORDER BY updated_at DESC").all() as any[];

  return c.json({ reviewItems: items, needsReviewRuns: runItems, browserSessionIssues: btItems });
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

// ── BROWSER TASKS ────────────────────────────────────────────────
app.get("/api/browser-tasks", c => c.json(db.prepare("SELECT * FROM browser_tasks ORDER BY updated_at DESC").all()));

app.post("/api/browser-tasks", async c => {
  const body = await c.req.json();
  const id = generateId();
  db.prepare(`INSERT INTO browser_tasks (id,name,site_name,url,goal,instructions,expected_output,success_criteria,risk_level,session_status,notes,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, body.name, body.site_name || null, body.url || null, body.goal || null,
    body.instructions || null, body.expected_output || null, body.success_criteria || null,
    body.risk_level || "low", body.session_status || "unknown", body.notes || null,
    body.status || "active", now(), now());
  return c.json({ id, ...body }, 201);
});

app.put("/api/browser-tasks/:id", async c => {
  const id = c.req.param("id");
  const body = await c.req.json();
  db.prepare(`UPDATE browser_tasks SET name=?,site_name=?,url=?,goal=?,instructions=?,expected_output=?,success_criteria=?,risk_level=?,session_status=?,notes=?,status=?,updated_at=? WHERE id=?`)
    .run(body.name, body.site_name || null, body.url || null, body.goal || null,
      body.instructions || null, body.expected_output || null, body.success_criteria || null,
      body.risk_level || "low", body.session_status || "unknown", body.notes || null,
      body.status || "active", now(), id);
  return c.json({ id, ...body });
});

app.delete("/api/browser-tasks/:id", c => {
  db.prepare("DELETE FROM browser_tasks WHERE id=?").run(c.req.param("id"));
  return c.json({ ok: true });
});

app.post("/api/browser-tasks/:id/runs", async c => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const task = db.prepare("SELECT name FROM browser_tasks WHERE id=?").get(id) as any;
  const runId = generateId();
  db.prepare(`INSERT INTO browser_task_runs (id,task_id,task_name,output,status,session_status,notes,started_at,completed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(runId, id, task?.name || "Unknown", body.output || null, body.status || "pending",
      body.session_status || null, body.notes || null, body.started_at || now(), body.completed_at || null, now());
  if (body.session_status) {
    db.prepare("UPDATE browser_tasks SET session_status=?,last_run_at=?,updated_at=? WHERE id=?")
      .run(body.session_status, now(), now(), id);
  }
  return c.json({ id: runId, ...body }, 201);
});

// ── PROMPT REGISTRY ──────────────────────────────────────────────
app.get("/api/prompts", c => {
  const workflows = db.prepare("SELECT id,name FROM workflows").all() as any[];
  const versions = db.prepare("SELECT * FROM prompt_versions ORDER BY workflow_id, version DESC").all() as any[];
  return c.json({ workflows, versions });
});

app.get("/api/prompts/:workflowId", c => {
  const versions = db.prepare("SELECT * FROM prompt_versions WHERE workflow_id=? ORDER BY version DESC").all(c.req.param("workflowId"));
  return c.json(versions);
});

app.post("/api/prompts/:workflowId", async c => {
  const workflowId = c.req.param("workflowId");
  const body = await c.req.json();
  const lastVer = (db.prepare("SELECT MAX(version) as v FROM prompt_versions WHERE workflow_id=?").get(workflowId) as any)?.v ?? 0;
  const id = generateId();
  db.prepare("INSERT INTO prompt_versions (id,workflow_id,version,prompt,change_note,created_at) VALUES (?,?,?,?,?,?)")
    .run(id, workflowId, lastVer + 1, body.prompt, body.change_note || null, now());
  // Update workflow's active prompt
  db.prepare("UPDATE workflows SET prompt=?,updated_at=? WHERE id=?").run(body.prompt, now(), workflowId);
  return c.json({ id, workflowId, version: lastVer + 1, ...body }, 201);
});

// ── AUTOMATIONS (Zo Agents) ─────────────────────────────────────
app.get("/api/automations", c => {
  const automations = db.prepare("SELECT * FROM zo_automations ORDER BY next_run ASC").all() as any[];
  return c.json(automations);
});

app.get("/api/automations/:id", c => {
  const a = db.prepare("SELECT * FROM zo_automations WHERE id=?").get(c.req.param("id"));
  if (!a) return c.json({ error: "Not found" }, 404);
  return c.json(a);
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

// ── VITE / STATIC ─────────────────────────────────────────────────
async function startServer() {
  const port = config.local_port;

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

export default app;
