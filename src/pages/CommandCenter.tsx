import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, ChevronRight, Activity, Inbox } from "lucide-react";
import { cn, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

interface DashboardData {
  stats: {
    activeWorkflows: number;
    staleWorkflows: number;
    failedRuns: number;
    pendingReviews: number;
    successRate: number;
    totalRuns: number;
    serviceCount: number;
    discoveredCount: number;
    browserTaskCount: number;
  };
  healthWarnings: string[];
  recentRuns: any[];
  latestHealth: any;
  lastScanAt: string | null;
}

function StatCard({ label, value, sub, color = "default", to }: { label: string; value: number | string; sub?: string; color?: string; to?: string }) {
  const colorMap: Record<string, string> = {
    default: "border-border",
    green: "border-emerald-500/25 bg-emerald-500/5",
    yellow: "border-yellow-500/25 bg-yellow-500/5",
    red: "border-red-500/25 bg-red-500/5",
    blue: "border-blue-500/25 bg-blue-500/5",
  };
  const valColorMap: Record<string, string> = {
    default: "text-foreground",
    green: "text-emerald-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    blue: "text-blue-400",
  };
  const content = (
    <div className={cn("border rounded-lg p-4 bg-card flex flex-col gap-1", colorMap[color] || colorMap.default)}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", valColorMap[color] || valColorMap.default)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed": return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
    case "failed": return <XCircle size={14} className="text-red-400 shrink-0" />;
    case "needs_review": return <AlertTriangle size={14} className="text-orange-400 shrink-0" />;
    default: return <Clock size={14} className="text-zinc-400 shrink-0" />;
  }
}

export default function CommandCenter({ onRefresh }: { onRefresh: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const dashboardData = await res.json();
        // Load latest cached health from history instead of making a live check
        try {
          const healthRes = await fetch("/api/health/history");
          if (healthRes.ok) {
            const history = await healthRes.json();
            if (history.length > 0) {
              dashboardData.latestHealth = history[0];
            }
          }
        } catch {}
        setData(dashboardData);
      } else {
        setLoadError(true);
        toast.error("Failed to load dashboard");
      }
    } catch {
      setLoadError(true);
      toast.error("Failed to load dashboard");
    }
    finally { setLoading(false); }
  }

  async function triggerScan() {
    try {
      const res = await fetch("/api/discovery/scan", { method: "POST" });
      if (!res.ok) { toast.error("Scan failed"); return; }
      const d = await res.json();
      toast.success(`Discovery scan complete — ${d.count} items found`);
      loadData();
      onRefresh();
    } catch { toast.error("Scan failed"); }
  }

  if (loading) return (
    <div className="p-6 flex items-center gap-2 text-muted-foreground">
      <RefreshCw size={16} className="animate-spin" /> Loading Command Center...
    </div>
  );

  if (loadError || !data) return (
    <div className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <AlertTriangle size={16} /> Failed to load dashboard
      </div>
      <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary border border-border text-muted-foreground hover:text-foreground">
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );

  const { stats, healthWarnings, recentRuns, latestHealth } = data;
  const healthColor = latestHealth?.overall_status === "healthy" ? "text-emerald-400" :
    latestHealth?.overall_status === "warning" ? "text-yellow-400" : "text-red-400";

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Zo Computer ops overview · Last scan {fmtRelative(data.lastScanAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {latestHealth && (
            <span className={cn("text-xs font-medium flex items-center gap-1.5", healthColor)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", latestHealth.overall_status === "healthy" ? "bg-emerald-400" : latestHealth.overall_status === "warning" ? "bg-yellow-400" : "bg-red-400")} />
              {latestHealth.overall_status?.toUpperCase()}
            </span>
          )}
          <button onClick={triggerScan} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors">
            <RefreshCw size={12} /> Scan
          </button>
        </div>
      </div>

      {/* Warnings */}
      {healthWarnings.length > 0 && (
        <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">Needs Attention</span>
          </div>
          <ul className="space-y-1">
            {healthWarnings.map((w, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                <ChevronRight size={12} className="text-yellow-500/50 shrink-0" /> {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Workflows" value={stats.activeWorkflows} to="/workflows" color={stats.activeWorkflows > 0 ? "green" : "default"} />
        <StatCard label="Stale Workflows" value={stats.staleWorkflows} to="/workflows" color={stats.staleWorkflows > 0 ? "yellow" : "green"} sub={stats.staleWorkflows > 0 ? "Need runs" : "All current"} />
        <StatCard label="Failed Runs" value={stats.failedRuns} to="/runs" color={stats.failedRuns > 0 ? "red" : "green"} sub={`of ${stats.totalRuns} total`} />
        <StatCard label="Pending Review" value={stats.pendingReviews} to="/review" color={stats.pendingReviews > 0 ? "yellow" : "green"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Run Success Rate" value={`${stats.successRate}%`} color={stats.successRate >= 80 ? "green" : stats.successRate >= 50 ? "yellow" : "red"} />
        <StatCard label="Services Tracked" value={stats.serviceCount} to="/services" color="blue" />
        <StatCard label="Browser Tasks" value={stats.browserTaskCount} to="/browser-tasks" color="default" />
        <StatCard label="Discovered Items" value={stats.discoveredCount} to="/discovery" color="blue" />
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent runs */}
        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium">Recent Runs</span>
            </div>
            <Link to="/runs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentRuns.length === 0 && (
              <p className="text-sm text-muted-foreground p-4">No runs yet</p>
            )}
            {recentRuns.slice(0, 6).map((run: any) => (
              <Link key={run.id} to={`/runs/${run.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                <RunStatusIcon status={run.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-medium">{run.workflow_name}</p>
                  <p className="text-xs text-muted-foreground">{fmtRelative(run.created_at)}</p>
                </div>
                <span className={cn("status-badge border", STATUS_COLORS[run.status] || STATUS_COLORS.pending)}>{statusLabel(run.status)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* System health snapshot */}
        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium">System Snapshot</span>
            </div>
            <Link to="/health" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Full health →</Link>
          </div>
          {latestHealth ? (
            <div className="p-4 space-y-3">
              {[
                { label: "Uptime", value: latestHealth.uptime_seconds ? `${Math.floor(latestHealth.uptime_seconds / 3600)}h ${Math.floor((latestHealth.uptime_seconds % 3600) / 60)}m` : "—" },
                { label: "Disk Used", value: latestHealth.disk_used_percent !== null ? `${latestHealth.disk_used_percent?.toFixed(0)}% of ${latestHealth.disk_total_gb?.toFixed(0)}GB` : "—" },
                { label: "Memory", value: latestHealth.mem_used_mb !== null ? `${latestHealth.mem_used_mb} / ${latestHealth.mem_total_mb} MB` : "—" },
                { label: "Load Avg", value: latestHealth.load_avg || "—" },
                { label: "Bun", value: latestHealth.bun_version || "—" },
                { label: "Node", value: latestHealth.node_version || "—" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-mono text-xs">{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <p className="text-sm text-muted-foreground">No health check yet.</p>
              <Link to="/health" className="mt-2 inline-block text-xs text-primary hover:underline">Run health check →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { to: "/workflows", label: "New Workflow", icon: "+" },
          { to: "/browser-tasks", label: "New Browser Task", icon: "+" },
          { to: "/review", label: "Review Queue", icon: <Inbox size={13} /> },
          { to: "/health", label: "Run Health Check", icon: <Activity size={13} /> },
        ].map(item => (
          <Link key={item.to} to={item.to} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground">
            <span className="text-primary">{item.icon}</span> {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
