import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Mail, CheckCircle, PauseCircle, Pencil, Check, X, ChevronRight, ExternalLink } from "lucide-react";
import { cn, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

interface Automation {
  id: string;
  title: string;
  delivery_method: string | null;
  schedule_summary: string | null;
  next_run: string | null;
  active: number;
  user_notes: string | null;
  instruction_summary: string | null;
}

interface Run {
  id: string;
  status: string;
  summary: string | null;
  output: string | null;
  created_at: string;
  completed_at: string | null;
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

const STATUS_DOT: Record<string, string> = {
  completed: "bg-emerald-400",
  failed: "bg-red-500",
  needs_review: "bg-orange-400",
  pending: "bg-zinc-500",
};

export default function AutomationDetail() {
  const { id } = useParams<{ id: string }>();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [expandedOutput, setExpandedOutput] = useState(false);

  useEffect(() => { if (id) load(id); }, [id]);

  async function load(automationId: string) {
    setLoading(true);
    setExpandedOutput(false);
    try {
      const res = await fetch(`/api/automations/${automationId}/history`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAutomation(data.automation);
      setRuns(data.runs);
      setNotesDraft(data.automation.user_notes ?? "");
    } catch (e: any) {
      toast.error(`Failed to load automation: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveNotes() {
    if (!automation) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_notes: notesDraft }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      setAutomation(prev => prev ? { ...prev, user_notes: updated.user_notes } : prev);
      setEditingNotes(false);
      toast.success("Description saved");
    } catch {
      toast.error("Failed to save description");
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="h-24 rounded-lg border border-border bg-card animate-pulse" />
        <div className="h-48 rounded-lg border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Automation not found.</p>
        <Link to="/automations" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ArrowLeft size={12} /> Back to Automations
        </Link>
      </div>
    );
  }

  const successCount = runs.filter(r => r.status === "completed").length;
  const failCount = runs.filter(r => r.status === "failed" || r.status === "needs_review").length;
  const successRate = runs.length > 0 ? Math.round((successCount / runs.length) * 100) : null;
  const latestRun = runs[0] ?? null;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Back nav */}
      <Link to="/automations" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={13} /> Automations
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-start gap-3">
          <h1 className="text-xl font-semibold flex-1">{automation.title}</h1>
          <span className={`shrink-0 inline-flex items-center gap-1 text-xs mt-0.5 ${automation.active ? "text-emerald-400" : "text-muted-foreground"}`}>
            {automation.active
              ? <><CheckCircle className="w-3.5 h-3.5" /> Active</>
              : <><PauseCircle className="w-3.5 h-3.5" /> Paused</>
            }
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {parseSchedule(automation.schedule_summary)}
          </span>
          {automation.next_run && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Next: {fmtRelative(automation.next_run)}
            </span>
          )}
          {automation.delivery_method && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {automation.delivery_method}
            </span>
          )}
        </div>
      </div>

      {/* Description card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h2>
          {!editingNotes && (
            <button
              onClick={() => { setNotesDraft(automation.user_notes ?? ""); setEditingNotes(true); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil size={11} /> Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              placeholder="Describe what this automation does in plain English…"
              rows={3}
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Check size={11} /> Save
              </button>
              <button
                onClick={() => setEditingNotes(false)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground"
              >
                <X size={11} /> Cancel
              </button>
            </div>
          </div>
        ) : automation.user_notes ? (
          <p className="text-sm text-foreground leading-relaxed">{automation.user_notes}</p>
        ) : (
          <p className="text-sm text-zinc-600 italic">
            No description yet.{" "}
            <button
              onClick={() => setEditingNotes(true)}
              className="text-primary hover:underline"
            >
              Add one
            </button>{" "}
            so you remember what this automation does.
          </p>
        )}
      </div>

      {/* Stats row */}
      {runs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{runs.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Runs</p>
          </div>
          <div className={cn("bg-card border rounded-lg p-3 text-center", successRate !== null && successRate >= 80 ? "border-emerald-500/20" : "border-yellow-500/20")}>
            <p className={cn("text-2xl font-bold tabular-nums", successRate !== null && successRate >= 80 ? "text-emerald-400" : "text-yellow-400")}>
              {successRate !== null ? `${successRate}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Success Rate</p>
          </div>
          <div className={cn("bg-card border rounded-lg p-3 text-center", failCount > 0 ? "border-red-500/20" : "border-border")}>
            <p className={cn("text-2xl font-bold tabular-nums", failCount > 0 ? "text-red-400" : "text-foreground")}>{failCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Failed</p>
          </div>
        </div>
      )}

      {/* Run history dots */}
      {runs.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Run History (last {runs.length})
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[...runs].reverse().map(r => (
              <Link
                key={r.id}
                to={`/runs/${r.id}`}
                title={`${statusLabel(r.status)} · ${fmtRelative(r.created_at)}`}
                className={cn("w-3.5 h-3.5 rounded-full transition-opacity hover:opacity-70", STATUS_DOT[r.status] ?? "bg-zinc-500")}
              />
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">Oldest → Most recent. Click a dot to view that run.</p>
        </div>
      )}

      {/* Latest output */}
      {latestRun && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h2 className="text-sm font-medium">Latest Run</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{fmtRelative(latestRun.created_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("status-badge border text-[10px]", STATUS_COLORS[latestRun.status] || STATUS_COLORS.pending)}>
                {statusLabel(latestRun.status)}
              </span>
              <Link to={`/runs/${latestRun.id}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ExternalLink size={11} /> Full run
              </Link>
            </div>
          </div>
          {latestRun.summary && (
            <div className="px-4 py-3 border-b border-border bg-secondary/20">
              <p className="text-sm text-foreground leading-relaxed">{latestRun.summary}</p>
            </div>
          )}
          {latestRun.output && (
            <div className="px-4 py-3">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                {expandedOutput ? latestRun.output : latestRun.output.slice(0, 400)}
                {!expandedOutput && latestRun.output.length > 400 && <span className="text-zinc-600">…</span>}
              </pre>
              {latestRun.output.length > 400 && (
                <button
                  onClick={() => setExpandedOutput(e => !e)}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  {expandedOutput ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* All runs list */}
      {runs.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">All Runs</h2>
          </div>
          <div className="divide-y divide-border">
            {runs.map(r => (
              <Link
                key={r.id}
                to={`/runs/${r.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[r.status] ?? "bg-zinc-500")} />
                <div className="flex-1 min-w-0">
                  {r.summary && <p className="text-xs text-muted-foreground truncate">{r.summary}</p>}
                  <p className="text-[10px] text-zinc-600">{fmtRelative(r.created_at)}</p>
                </div>
                <span className={cn("status-badge border text-[10px] shrink-0", STATUS_COLORS[r.status] || STATUS_COLORS.pending)}>
                  {statusLabel(r.status)}
                </span>
                <ChevronRight size={12} className="text-zinc-700 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {runs.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No runs recorded for this automation yet.</p>
          <p className="text-xs text-zinc-600 mt-1">Run outputs will appear here once they've been logged.</p>
        </div>
      )}
    </div>
  );
}
