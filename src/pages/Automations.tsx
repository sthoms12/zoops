import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Calendar, Mail, CheckCircle, PauseCircle, Pencil, Check, X, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fmtRelative } from "@/lib/utils";

interface Automation {
  id: string;
  title: string;
  delivery_method: string | null;
  schedule_summary: string | null;
  next_run: string | null;
  active: number;
  user_notes: string | null;
}

function parseSchedule(rrule: string | null): string {
  if (!rrule) return "—";
  if (!rrule.includes("FREQ=")) return rrule;
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
    return rrule;
  } catch { return rrule; }
}

function AutomationCard({ automation, onSaveNotes }: { automation: Automation; onSaveNotes: (id: string, notes: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(automation.user_notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSaveNotes(automation.id, draft);
      setEditing(false);
    } catch {
      // toast shown by parent; just unblock the button
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(automation.user_notes ?? "");
    setEditing(false);
  }

  return (
    <div className={`rounded-lg border border-border bg-card ${!automation.active ? "opacity-55" : ""}`}>
      <div className="px-4 py-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <Link to={`/automations/${automation.id}`} className="text-sm font-medium leading-snug hover:text-primary transition-colors flex-1 min-w-0 flex items-center gap-1.5 group">
            <span className="truncate">{automation.title}</span>
            <ChevronRight size={13} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
          </Link>
          <span className={`shrink-0 inline-flex items-center gap-1 text-xs ${automation.active ? "text-emerald-400" : "text-muted-foreground"}`}>
            {automation.active
              ? <><CheckCircle className="w-3 h-3" /> Active</>
              : <><PauseCircle className="w-3 h-3" /> Paused</>
            }
          </span>
        </div>

        {/* Schedule row */}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {parseSchedule(automation.schedule_summary)}
          </span>
          {automation.next_run && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Next: {fmtRelative(automation.next_run)}
            </span>
          )}
          {automation.delivery_method && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {automation.delivery_method}
            </span>
          )}
        </div>

        {/* Description / notes */}
        {editing ? (
          <div className="mt-2.5 space-y-2">
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Add a plain-English description of what this automation does…"
              rows={2}
              className="w-full px-3 py-2 text-xs bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Check size={11} /> Save
              </button>
              <button onClick={cancel} className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground">
                <X size={11} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex items-start gap-2 group/notes">
            {automation.user_notes ? (
              <p className="text-xs text-muted-foreground flex-1 italic leading-relaxed">{automation.user_notes}</p>
            ) : (
              <p className="text-xs text-zinc-700 flex-1 italic">No description yet</p>
            )}
            <button
              onClick={() => { setDraft(automation.user_notes ?? ""); setEditing(true); }}
              className="shrink-0 p-1 rounded text-zinc-600 hover:text-muted-foreground hover:bg-white/5 transition-colors opacity-0 group-hover/notes:opacity-100"
              title="Edit description"
            >
              <Pencil size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
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

  async function saveNotes(id: string, notes: string) {
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_notes: notes }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, user_notes: updated.user_notes } : a));
      toast.success("Description saved");
    } catch {
      toast.error("Failed to save description");
      throw new Error("save failed");
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/automations/deep-refresh", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.started) {
        toast.message("Automation sync is already running");
      }

      const startedAt = Date.now();
      let finished = false;

      while (Date.now() - startedAt < 180000) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const statusRes = await fetch("/api/automations/status");
        if (!statusRes.ok) continue;
        const status = await statusRes.json();
        if (!status.syncing) {
          finished = true;
          await load(true);
          if (status.lastError) {
            throw new Error(status.lastError);
          }
          if (status.lastPartial) {
            toast.warning(`Partial sync returned ${status.lastCount ?? 0} of ${status.lastExistingCount ?? status.count ?? 0}; kept existing cached rows`);
          } else {
            toast.success(`Synced ${status.lastCount ?? status.count ?? 0} automations`);
          }
          break;
        }
      }

      if (!finished) {
        toast.message("Automation sync is still running in the background");
      }
    } catch (e: any) {
      toast.error(`Failed to refresh automations: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Silently reload every 3 minutes to pick up background syncs
  useEffect(() => {
    const interval = setInterval(() => load(true), 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const active = automations.filter(a => a.active);
  const paused = automations.filter(a => !a.active);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Automations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${automations.length} scheduled agents · ${active.length} active`}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : automations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No automations cached.
        </div>
      ) : (
        <div className="space-y-2">
          {[...active, ...paused].map(a => (
            <AutomationCard key={a.id} automation={a} onSaveNotes={saveNotes} />
          ))}
        </div>
      )}
    </div>
  );
}
