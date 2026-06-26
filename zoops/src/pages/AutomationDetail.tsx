import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Mail, CheckCircle, PauseCircle, Pencil, Check, X } from "lucide-react";
import { fmtRelative } from "@/lib/utils";
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

export default function AutomationDetail() {
  const { id } = useParams<{ id: string }>();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => { if (id) load(id); }, [id]);

  async function load(automationId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/automations/${automationId}/history`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAutomation(data.automation);
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

    </div>
  );
}
