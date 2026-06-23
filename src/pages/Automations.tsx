import { useEffect, useState } from "react";
import { RefreshCw, Clock, Calendar, Mail, CheckCircle, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { fmtRelative } from "@/lib/utils";

interface Automation {
  id: string;
  title: string;
  delivery_method: string | null;
  schedule_summary: string | null;
  next_run: string | null;
  active: number;
}

function parseRRule(rrule: string | null): string {
  if (!rrule) return "—";
  try {
    const freq = rrule.match(/FREQ=(\w+)/)?.[1] ?? "";
    const days = (rrule.match(/BYDAY=([^;\n]+)/)?.[1] ?? "").split(",").filter(Boolean);
    const hour = rrule.match(/BYHOUR=(\d+)/)?.[1];
    const interval = parseInt(rrule.match(/INTERVAL=(\d+)/)?.[1] ?? "1");
    const dayMap: Record<string, string> = { MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun" };
    const h = hour !== undefined ? parseInt(hour) : null;
    const timeStr = h !== null ? `${h === 0 ? 12 : h > 12 ? h - 12 : h}:00 ${h < 12 ? "AM" : "PM"}` : "";
    if (freq === "DAILY") return interval > 1 ? `Every ${interval} days${timeStr ? ` at ${timeStr}` : ""}` : `Daily${timeStr ? ` at ${timeStr}` : ""}`;
    if (freq === "WEEKLY") {
      const dayStr = days.map(d => dayMap[d] ?? d).join(", ");
      return `Weekly${dayStr ? ` on ${dayStr}` : ""}${timeStr ? ` at ${timeStr}` : ""}`;
    }
    if (freq === "MONTHLY") return `Monthly${timeStr ? ` at ${timeStr}` : ""}`;
    return freq.charAt(0) + freq.slice(1).toLowerCase();
  } catch { return "Custom schedule"; }
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/automations");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAutomations(await res.json());
    } catch (e: any) {
      toast.error(`Failed to load automations: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/automations/refresh", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load(true);
      toast.success("Automations synced from Zo");
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const active = automations.filter(a => a.active);
  const paused = automations.filter(a => !a.active);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Automations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${automations.length} scheduled agents · ${active.length} active`}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Syncing…" : "Sync from Zo"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : automations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No automations cached. Click "Sync from Zo" to fetch your scheduled agents.
        </div>
      ) : (
        <div className="space-y-2">
          {[...active, ...paused].map(a => (
            <div
              key={a.id}
              className={`rounded-lg border border-border bg-card px-4 py-3 ${!a.active ? "opacity-55" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium leading-snug">{a.title}</span>
                <span className={`shrink-0 inline-flex items-center gap-1 text-xs ${a.active ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {a.active
                    ? <><CheckCircle className="w-3 h-3" /> Active</>
                    : <><PauseCircle className="w-3 h-3" /> Paused</>
                  }
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {parseRRule(a.schedule_summary)}
                </span>
                {a.next_run && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Next: {fmtRelative(a.next_run)}
                  </span>
                )}
                {a.delivery_method && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {a.delivery_method}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
