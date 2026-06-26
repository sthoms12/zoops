import { execSync } from "child_process";
import { db, generateId, now } from "./db";
import { getSettingNumber } from "./settings";

export interface HealthSnapshot {
  id: string;
  timestamp: string;
  overall_status: "healthy" | "warning" | "failed";
  uptime_seconds: number | null;
  load_avg: string | null;
  disk_used_percent: number | null;
  disk_used_gb: number | null;
  disk_total_gb: number | null;
  mem_used_mb: number | null;
  mem_total_mb: number | null;
  mem_used_percent: number | null;
  process_count: number | null;
  bun_version: string | null;
  node_version: string | null;
  sqlite_version: string | null;
  stale_workflows: number;
  service_count: number;
  details: Record<string, unknown>;
}

function safeExec(cmd: string, timeout = 3000): string {
  try {
    return execSync(cmd, { timeout, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
  } catch {
    return "";
  }
}

function parseUptime(): number | null {
  try {
    const raw = safeExec("cat /proc/uptime");
    if (!raw) return null;
    return Math.floor(parseFloat(raw.split(" ")[0]));
  } catch { return null; }
}

function parseLoadAvg(): string | null {
  try {
    const raw = safeExec("cat /proc/loadavg");
    if (!raw) return null;
    const parts = raw.split(" ");
    return `${parts[0]} ${parts[1]} ${parts[2]}`;
  } catch { return null; }
}

function parseDisk(): { usedPercent: number | null; usedGb: number | null; totalGb: number | null } {
  try {
    const raw = safeExec("df -BG / | tail -1");
    if (!raw) return { usedPercent: null, usedGb: null, totalGb: null };
    const parts = raw.split(/\s+/);
    const total = parseFloat(parts[1]);
    const used = parseFloat(parts[2]);
    const pct = parseFloat(parts[4]);
    return { usedPercent: pct || null, usedGb: used || null, totalGb: total || null };
  } catch { return { usedPercent: null, usedGb: null, totalGb: null }; }
}

function parseMem(): { usedMb: number | null; totalMb: number | null; usedPercent: number | null } {
  try {
    const raw = safeExec("free -m | grep Mem:");
    if (!raw) return { usedMb: null, totalMb: null, usedPercent: null };
    const parts = raw.split(/\s+/);
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    const pct = total > 0 ? Math.round((used / total) * 100) : null;
    return { usedMb: used, totalMb: total, usedPercent: pct };
  } catch { return { usedMb: null, totalMb: null, usedPercent: null }; }
}

function parseProcessCount(): number | null {
  try {
    const raw = safeExec("ps aux | wc -l");
    const n = parseInt(raw);
    return isNaN(n) ? null : Math.max(0, n - 1);
  } catch { return null; }
}

function getRuntimeVersions(): { bun: string | null; node: string | null; sqlite: string | null } {
  const bun = safeExec("bun --version") || null;
  const node = safeExec("node --version") || null;
  const sqlite = safeExec("sqlite3 --version 2>/dev/null | cut -d' ' -f1") || null;
  return { bun, node, sqlite };
}

function hasWorkflowsTable(): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='workflows'").get() as { name?: string } | null;
  return !!row?.name;
}

export function runHealthCheck(): HealthSnapshot {
  const uptime = parseUptime();
  const load = parseLoadAvg();
  const disk = parseDisk();
  const mem = parseMem();
  const procs = parseProcessCount();
  const versions = getRuntimeVersions();

  const diskWarnPercent = getSettingNumber("diskWarningPercent", 70);
  const memWarnPercent = getSettingNumber("memWarningPercent", 80);
  const staleThresholdDays = getSettingNumber("staleThresholdDays", 7);

  const staleWorkflows = hasWorkflowsTable()
    ? ((db.prepare(
        `SELECT COUNT(*) as c
         FROM workflows
         WHERE last_run_at IS NULL OR last_run_at < datetime('now', ?)`
      ).get(`-${staleThresholdDays} days`) as { c: number })?.c ?? 0)
    : 0;

  const serviceCount = (db.prepare(
    `SELECT COUNT(*) as c FROM services`
  ).get() as { c: number })?.c ?? 0;

  // Determine overall status
  let overall_status: "healthy" | "warning" | "failed" = "healthy";
  if (
    (disk.usedPercent !== null && disk.usedPercent >= 90) ||
    (mem.usedPercent !== null && mem.usedPercent >= 90)
  ) {
    overall_status = "failed";
  } else if (
    staleWorkflows > 0 ||
    (disk.usedPercent !== null && disk.usedPercent >= diskWarnPercent) ||
    (mem.usedPercent !== null && mem.usedPercent >= memWarnPercent)
  ) {
    overall_status = "warning";
  }

  const snapshot: HealthSnapshot = {
    id: generateId(),
    timestamp: now(),
    overall_status,
    uptime_seconds: uptime,
    load_avg: load,
    disk_used_percent: disk.usedPercent,
    disk_used_gb: disk.usedGb,
    disk_total_gb: disk.totalGb,
    mem_used_mb: mem.usedMb,
    mem_total_mb: mem.totalMb,
    mem_used_percent: mem.usedPercent,
    process_count: procs,
    bun_version: versions.bun,
    node_version: versions.node,
    sqlite_version: versions.sqlite,
    stale_workflows: staleWorkflows,
    service_count: serviceCount,
    details: {
      checks: {
        appReachable: true,
        dbReachable: true,
        uptimeOk: uptime !== null,
        diskOk: disk.usedPercent !== null ? disk.usedPercent < diskWarnPercent : null,
        memOk: mem.usedPercent !== null ? mem.usedPercent < memWarnPercent : null,
      },
    },
  };

  // Persist snapshot (keep last 100)
  db.prepare(`INSERT INTO health_snapshots (id,timestamp,overall_status,uptime_seconds,load_avg,disk_used_percent,disk_used_gb,disk_total_gb,mem_used_mb,mem_total_mb,mem_used_percent,process_count,bun_version,node_version,sqlite_version,failed_runs_24h,pending_reviews,stale_workflows,service_count,details)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    snapshot.id, snapshot.timestamp, snapshot.overall_status,
    snapshot.uptime_seconds, snapshot.load_avg,
    snapshot.disk_used_percent, snapshot.disk_used_gb, snapshot.disk_total_gb,
    snapshot.mem_used_mb, snapshot.mem_total_mb, snapshot.mem_used_percent,
    snapshot.process_count, snapshot.bun_version, snapshot.node_version, snapshot.sqlite_version,
    0, 0, snapshot.stale_workflows, snapshot.service_count,
    JSON.stringify(snapshot.details)
  );

  db.run("DELETE FROM health_snapshots WHERE id NOT IN (SELECT id FROM health_snapshots ORDER BY timestamp DESC LIMIT 100)");

  return snapshot;
}
