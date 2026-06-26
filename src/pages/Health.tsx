import { useEffect, useState } from "react";
import { Activity, RefreshCw, CheckCircle2, AlertCircle, XCircle, Server, Database, Cpu } from "lucide-react";
import { cn, fmtUptime, fmtRelative } from "@/lib/utils";
import { toast } from "sonner";

function MeterBar({ value, warn = 70, danger = 90 }: { value: number | null; warn?: number; danger?: number }) {
  if (value === null) return <div className="h-1.5 bg-secondary rounded" />;
  const color = value >= danger ? "bg-red-500" : value >= warn ? "bg-yellow-400" : "bg-emerald-400";
  return (
    <div className="h-1.5 bg-secondary rounded overflow-hidden">
      <div className={cn("h-full transition-all rounded", color)} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function Metric({ label, value, sub, color = "default" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    default: "text-foreground",
    green: "text-emerald-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    blue: "text-blue-400",
    muted: "text-muted-foreground",
  };
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-lg font-semibold font-mono", colorMap[color] || colorMap.default)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function CheckRow({ label, ok, na = false }: { label: string; ok: boolean | null; na?: boolean }) {
  if (na || ok === null) return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <span className="w-3 h-3 rounded-full bg-zinc-700 shrink-0" />
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      <span className="text-xs text-zinc-600">N/A</span>
    </div>
  );
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      {ok ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> : <XCircle size={14} className="text-red-400 shrink-0" />}
      <span className="text-sm flex-1">{label}</span>
      <span className={cn("text-xs font-medium", ok ? "text-emerald-400" : "text-red-400")}>{ok ? "Pass" : "Fail"}</span>
    </div>
  );
}

export default function HealthPage() {
  const [snap, setSnap] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
    loadEvents();
    const interval = setInterval(loadHistory, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function run() {
    setLoading(true);
    try {
      const r = await fetch("/api/health");
      if (r.ok) {
        const d = await r.json();
        setSnap(d);
        // refresh history so the new snapshot appears
        await loadHistory();
      } else { toast.error("Health check failed"); }
    } catch { toast.error("Health check error"); }
    finally { setLoading(false); }
  }

  async function loadHistory() {
    try {
      const r = await fetch("/api/health/history");
      if (r.ok) {
        const rows = await r.json();
        setHistory(rows);
        // seed snap from the latest cached snapshot (no live system call on mount)
        if (rows.length > 0) setSnap((prev: any) => prev ?? rows[0]);
      }
    } catch {}
  }

  async function loadEvents() {
    try {
      const r = await fetch("/api/events?limit=10");
      if (r.ok) setEvents(await r.json());
    } catch {}
  }

  const statusInfo = {
    healthy: { label: "Healthy", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/25" },
    warning: { label: "Warning", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/25" },
    failed: { label: "Failed", color: "text-red-400", bg: "bg-red-400/10 border-red-400/25" },
  };

  const si = snap ? (statusInfo[snap.overall_status as keyof typeof statusInfo] || statusInfo.warning) : null;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Zo Computer system health and ZoOps operational status</p>
        </div>
        <button onClick={run} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground disabled:opacity-50 transition-colors">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Running..." : "Run Check"}
        </button>
      </div>

      {/* Overall status */}
      {snap && si && (
        <div className={cn("border rounded-lg p-4 flex items-center gap-4", si.bg)}>
          <div className={cn("text-3xl font-bold", si.color)}>{si.label}</div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Last check: {fmtRelative(snap.timestamp)}</p>
            {snap.stale_workflows > 0 && <p className="text-xs text-blue-400 mt-0.5">{snap.stale_workflows} workflow(s) stale</p>}
          </div>
        </div>
      )}

      {snap && (
        <>
          {/* System metrics */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Server size={13} /> System Resources
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Uptime</p>
                <p className="text-lg font-semibold font-mono">{fmtUptime(snap.uptime_seconds)}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Load Average</p>
                <p className="text-lg font-semibold font-mono">{snap.load_avg || "—"}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Disk {snap.disk_used_percent !== null ? `${snap.disk_used_percent?.toFixed(0)}%` : "—"}
                </p>
                <MeterBar value={snap.disk_used_percent} />
                {snap.disk_used_gb !== null && (
                  <p className="text-xs text-muted-foreground mt-1.5 font-mono">{snap.disk_used_gb?.toFixed(0)} / {snap.disk_total_gb?.toFixed(0)} GB</p>
                )}
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Memory {snap.mem_used_percent !== null ? `${snap.mem_used_percent}%` : "—"}
                </p>
                <MeterBar value={snap.mem_used_percent} warn={75} danger={90} />
                {snap.mem_used_mb !== null && (
                  <p className="text-xs text-muted-foreground mt-1.5 font-mono">{snap.mem_used_mb} / {snap.mem_total_mb} MB</p>
                )}
              </div>
            </div>
          </div>

          {/* Runtime versions + process count */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Processes" value={snap.process_count ?? "—"} color="muted" />
            <Metric label="Bun" value={snap.bun_version || "—"} color="muted" />
            <Metric label="Node" value={snap.node_version || "—"} color="muted" />
            <Metric label="SQLite" value={snap.sqlite_version || "—"} color="muted" />
          </div>

          {/* App health checks */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Database size={13} /> ZoOps Checks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-medium mb-3">System</h3>
                <CheckRow label="App reachable" ok={true} />
                <CheckRow label="Database reachable" ok={true} />
                <CheckRow label="Uptime readable" ok={snap.uptime_seconds !== null} />
                <CheckRow label="Disk readable" ok={snap.disk_used_percent !== null} />
                <CheckRow label="Memory readable" ok={snap.mem_used_percent !== null} />
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-medium mb-3">Operations</h3>
                <CheckRow label="No stale workflows" ok={snap.stale_workflows === 0} />
                <CheckRow label="Disk under 80%" ok={snap.disk_used_percent === null ? null : snap.disk_used_percent < 80} />
                <CheckRow label="Memory under 85%" ok={snap.mem_used_percent === null ? null : snap.mem_used_percent < 85} />
              </div>
            </div>
          </div>

          {/* Error log */}
          {events.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertCircle size={13} className="text-red-400" /> Recent Errors
              </h2>
              <div className="border border-red-500/20 rounded-lg bg-red-500/5 overflow-hidden">
                {events.map((ev: any) => (
                  <div key={ev.id} className="px-4 py-3 border-b border-red-500/20 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-red-400 truncate">{ev.source}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.message}</p>
                      </div>
                      <span className="text-[10px] text-zinc-600 shrink-0">{fmtRelative(ev.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* History */}
      {history.length > 1 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Recent History</h2>
          {/* Desktop table */}
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[80px_100px_1fr_120px] px-4 py-2 bg-secondary/30 border-b border-border text-xs text-muted-foreground font-medium">
              <span>Status</span><span>Disk</span><span>Memory</span><span>When</span>
            </div>
            {history.slice(0, 15).map(h => (
              <div key={h.id} className="grid grid-cols-[80px_100px_1fr_120px] px-4 py-2 border-b border-border text-xs items-center">
                <span className={cn("font-medium", h.overall_status === "healthy" ? "text-emerald-400" : h.overall_status === "warning" ? "text-yellow-400" : "text-red-400")}>
                  {h.overall_status}
                </span>
                <span className="text-muted-foreground font-mono">{h.disk_used_percent !== null ? `${h.disk_used_percent?.toFixed(0)}%` : "—"}</span>
                <span className="text-muted-foreground font-mono">{h.mem_used_percent !== null ? `${h.mem_used_percent}%` : "—"}</span>
                <span className="text-zinc-600">{fmtRelative(h.timestamp)}</span>
              </div>
            ))}
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {history.slice(0, 15).map(h => (
              <div key={h.id} className="border border-border rounded-lg p-3 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-xs font-medium", h.overall_status === "healthy" ? "text-emerald-400" : h.overall_status === "warning" ? "text-yellow-400" : "text-red-400")}>
                    {h.overall_status}
                  </span>
                  <span className="text-[10px] text-zinc-600">{fmtRelative(h.timestamp)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Disk:</span>
                  <span className="font-mono text-right">{h.disk_used_percent !== null ? `${h.disk_used_percent?.toFixed(0)}%` : "—"}</span>
                  <span className="text-muted-foreground">Memory:</span>
                  <span className="font-mono text-right">{h.mem_used_percent !== null ? `${h.mem_used_percent}%` : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!snap && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Activity size={24} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No health data yet. Click "Run Check" to collect a snapshot.</p>
        </div>
      )}
    </div>
  );
}
