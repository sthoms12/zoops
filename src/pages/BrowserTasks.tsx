import { useEffect, useState } from "react";
import { Globe, Plus, AlertTriangle, CheckCircle2, HelpCircle, Copy, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

const SESSION_HEALTH: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  working: { label: "Working", color: "text-emerald-400", icon: <CheckCircle2 size={13} className="text-emerald-400" /> },
  unknown: { label: "Unknown", color: "text-zinc-500", icon: <HelpCircle size={13} className="text-zinc-500" /> },
  login_expired: { label: "Login Expired", color: "text-orange-400", icon: <AlertTriangle size={13} className="text-orange-400" /> },
  needs_2fa: { label: "2FA Needed", color: "text-yellow-400", icon: <AlertTriangle size={13} className="text-yellow-400" /> },
  blocked: { label: "Blocked", color: "text-red-400", icon: <AlertTriangle size={13} className="text-red-400" /> },
  layout_drift: { label: "Layout Drift", color: "text-purple-400", icon: <AlertTriangle size={13} className="text-purple-400" /> },
  stale: { label: "Stale", color: "text-blue-400", icon: <HelpCircle size={13} className="text-blue-400" /> },
};

function TaskCard({ task, onUpdate, onDelete }: { task: any; onUpdate: () => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(task.session_status);
  const session = SESSION_HEALTH[sessionStatus] || SESSION_HEALTH.unknown;

  async function updateSession(s: string) {
    setSessionStatus(s);
    try {
      const res = await fetch(`/api/browser-tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, session_status: s }),
      });
      if (!res.ok) { toast.error("Failed to update session status"); setSessionStatus(task.session_status); return; }
      toast.success("Session status updated");
      onUpdate();
    } catch { toast.error("Failed to update session status"); setSessionStatus(task.session_status); }
  }

  async function captureRun(status: string) {
    try {
      const res = await fetch(`/api/browser-tasks/${task.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, session_status: sessionStatus, started_at: new Date().toISOString() }),
      });
      if (!res.ok) { toast.error("Failed to record run"); return; }
      toast.success("Run recorded");
      onUpdate();
    } catch { toast.error("Failed to record run"); }
  }

  const riskColor = task.risk_level === "high" ? "border-red-500/25" : task.risk_level === "medium" ? "border-yellow-500/25" : "border-border";

  return (
    <div className={cn("border rounded-lg bg-card overflow-hidden", riskColor)}>
      <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setExpanded(!expanded)}>
        <Globe size={15} className="text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{task.name}</span>
            {task.site_name && <span className="text-xs text-muted-foreground">{task.site_name}</span>}
            <span className={cn("flex items-center gap-1 text-xs", session.color)}>
              {session.icon} {session.label}
            </span>
            {task.risk_level !== "low" && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
                task.risk_level === "high" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400")}>
                {task.risk_level} risk
              </span>
            )}
          </div>
          {task.goal && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.goal}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-600">
            {task.url && <span className="font-mono truncate max-w-[200px]">{task.url}</span>}
            <span>Last run: {fmtRelative(task.last_run_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Instructions */}
          {task.instructions && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-muted-foreground font-medium">Instructions for Zo</label>
                <button onClick={() => { navigator.clipboard.writeText(task.instructions); toast.success("Copied!"); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Copy size={11} /> Copy
                </button>
              </div>
              <pre className="text-xs font-mono text-foreground bg-secondary/30 border border-border rounded-md p-3 whitespace-pre-wrap">{task.instructions}</pre>
            </div>
          )}

          {/* Expected output */}
          {task.expected_output && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Expected Output</label>
              <p className="text-xs text-foreground">{task.expected_output}</p>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <p className="text-xs text-muted-foreground">{task.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Update session:</span>
            {Object.keys(SESSION_HEALTH).map(s => (
              <button key={s} onClick={() => updateSession(s)}
                className={cn("px-2 py-1 text-[10px] rounded border transition-colors",
                  sessionStatus === s ? "bg-primary/20 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
                {SESSION_HEALTH[s].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Record run:</span>
            <button onClick={() => captureRun("completed")} className="px-2 py-1 text-xs rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">Completed</button>
            <button onClick={() => captureRun("failed")} className="px-2 py-1 text-xs rounded border border-red-500/20 text-red-400 hover:bg-red-500/10">Failed</button>
            <div className="ml-auto">
              <button onClick={() => onDelete(task.id)} className="px-2 py-1 text-xs rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 flex items-center gap-1">
                <Trash2 size={11} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", site_name: "", url: "", goal: "", instructions: "",
    expected_output: "", success_criteria: "", risk_level: "low", notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/browser-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { toast.error("Failed to create task"); return; }
      toast.success("Browser task created");
      onCreated();
      onClose();
    } catch { toast.error("Failed to create task"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90dvh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold">New Browser Task</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Define a browser-based playbook for Zo to follow</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs text-muted-foreground block mb-1">Task Name *</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Vendor Portal Check" required /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Site/App Name</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.site_name} onChange={e => setForm(p => ({ ...p, site_name: e.target.value }))} placeholder="Acme Portal" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Starting URL</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground block mb-1">Goal</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.goal} onChange={e => setForm(p => ({ ...p, goal: e.target.value }))} placeholder="Check for pending invoices and alerts" /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground block mb-1">Instructions for Zo</label>
              <textarea className="w-full h-28 px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
                value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} placeholder="1. Navigate to the Invoices section&#10;2. Note any pending items..." /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Expected Output</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.expected_output} onChange={e => setForm(p => ({ ...p, expected_output: e.target.value }))} placeholder="List of pending items" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Risk Level</label>
              <select className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.risk_level} onChange={e => setForm(p => ({ ...p, risk_level: e.target.value }))}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-secondary text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Creating..." : "Create Task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BrowserTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/browser-tasks");
      if (r.ok) setTasks(await r.json());
      else toast.error("Failed to load browser tasks");
    } catch { toast.error("Failed to load browser tasks"); }
    finally { setLoading(false); }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this browser task?")) return;
    try {
      const res = await fetch(`/api/browser-tasks/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete task"); return; }
      toast.success("Deleted");
      load();
    } catch { toast.error("Failed to delete task"); }
  }

  const issues = tasks.filter(t => ["login_expired", "needs_2fa", "blocked"].includes(t.session_status));

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Browser Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Managed playbooks for Zo's browser — vendor portals, dashboards, invoice checks</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={14} /> New Task
        </button>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{tasks.length}</strong> tasks</span>
        <span><strong className="text-emerald-400">{tasks.filter(t => t.session_status === "working").length}</strong> working</span>
        {issues.length > 0 && <span><strong className="text-orange-400">{issues.length}</strong> need attention</span>}
      </div>

      {issues.length > 0 && (
        <div className="rounded-lg border border-orange-500/25 bg-orange-500/5 p-3">
          <p className="text-xs text-orange-400 font-medium">{issues.length} browser session(s) need attention — check login status or 2FA</p>
        </div>
      )}

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> :
        tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <Globe size={24} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No browser tasks yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => <TaskCard key={task.id} task={task} onUpdate={load} onDelete={deleteTask} />)}
          </div>
        )}

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
