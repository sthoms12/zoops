import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, AlertTriangle, ChevronRight, Activity, Zap, Clock } from "lucide-react";
import { cn, fmtRelative } from "@/lib/utils";
import { toast } from "sonner";

interface DashboardData {
  stats: {
    automationsCount: number;
    liveSites: number;
    discoveredCount: number;
  };
  healthWarnings: string[];
  recentAutomations: any[];
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

export default function CommandCenter({ onRefresh }: { onRefresh: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadData(quiet = false) {
    if (!quiet) { setLoading(true); setLoadError(false); }
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const dashboardData = await res.json();
        try {
          const healthRes = await fetch("/api/health/history");
          if (healthRes.ok) {
            const history = await healthRes.json();
            if (history.length > 0) dashboardData.latestHealth = history[0];
          }
        } catch {}
        setData(dashboardData);
      } else if (!quiet) {
        setLoadError(true);
        toast.error("Failed to load dashboard");
      }
    } catch {
      if (!quiet) { setLoadError(true); toast.error("Failed to load dashboard"); }
    }
    finally { if (!quiet) setLoading(false); }
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

  const { stats, healthWarnings, recentAutomations, latestHealth } = data;
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Active Automations" value={stats.automationsCount} to="/automations" color="blue" />
        <StatCard label="Sites & Services" value={stats.liveSites} to="/sites" color="blue" />
        <StatCard label="Discovered Items" value={stats.discoveredCount} to="/discovery" color="blue" />
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming automations */}
        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium">Upcoming Automations</span>
            </div>
            <Link to="/automations" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentAutomations.length === 0 && (
              <p className="text-sm text-muted-foreground p-4">No automations found</p>
            )}
            {recentAutomations.map((a: any) => (
              <Link key={a.id} to={`/automations/${a.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                <Zap size={12} className={cn("shrink-0", a.active ? "text-emerald-400" : "text-zinc-600")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-medium">{a.title}</p>
                  {a.next_run && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> {fmtRelative(a.next_run)}</p>}
                </div>
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
