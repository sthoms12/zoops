import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dir, "../data");
mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(join(DATA_DIR, "zoops.db"), { create: true });
db.run("PRAGMA journal_mode=WAL");
db.run("PRAGMA foreign_keys=ON");
db.run("PRAGMA synchronous=NORMAL");
// Retry up to 5s on a locked DB instead of throwing immediately
db.run("PRAGMA busy_timeout=5000");

export function initDb() {
  db.run(`CREATE TABLE IF NOT EXISTS workflow_runs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT,
    workflow_name TEXT,
    input_prompt TEXT,
    output TEXT,
    summary TEXT,
    status TEXT DEFAULT 'pending',
    review_status TEXT DEFAULT 'pending',
    error TEXT,
    duration_ms INTEGER,
    notes TEXT,
    reviewer_notes TEXT,
    reviewed_by TEXT,
    started_at TEXT,
    completed_at TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT,
    type TEXT DEFAULT 'unknown',
    status TEXT DEFAULT 'unknown',
    endpoint TEXT,
    port INTEGER,
    last_checked_at TEXT,
    notes TEXT,
    is_auto_detected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS skills_personas (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT,
    purpose TEXT,
    notes TEXT,
    related_workflow TEXT,
    last_reviewed_at TEXT,
    is_auto_detected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS discovered_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT,
    description TEXT,
    metadata TEXT,
    discovered_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS review_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    ref_id TEXT,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    notes TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS health_snapshots (
    id TEXT PRIMARY KEY,
    timestamp TEXT DEFAULT (datetime('now')),
    overall_status TEXT,
    uptime_seconds INTEGER,
    load_avg TEXT,
    disk_used_percent REAL,
    disk_used_gb REAL,
    disk_total_gb REAL,
    mem_used_mb INTEGER,
    mem_total_mb INTEGER,
    mem_used_percent REAL,
    process_count INTEGER,
    bun_version TEXT,
    node_version TEXT,
    sqlite_version TEXT,
    failed_runs_24h INTEGER DEFAULT 0,
    pending_reviews INTEGER DEFAULT 0,
    stale_workflows INTEGER DEFAULT 0,
    service_count INTEGER DEFAULT 0,
    details TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS app_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'backend',
    message TEXT,
    stack TEXT,
    context TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS zo_automations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    delivery_method TEXT,
    schedule_summary TEXT,
    next_run TEXT,
    active INTEGER DEFAULT 1,
    instruction_summary TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // Keep event log from growing unboundedly — prune on startup
  db.run("DELETE FROM app_events WHERE timestamp < datetime('now', '-30 days')");
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function now(): string {
  return new Date().toISOString();
}
