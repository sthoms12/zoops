import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Workflow, Search, Filter, Clock, CheckCircle2, AlertTriangle, XCircle, Pause, Archive } from "lucide-react";
import { cn, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

const HEALTH_ICONS: Record<string, React.ReactNode> = {
  healthy: <CheckCircle2 size={14} className="text-emerald-400" />,
  needs_review: <AlertTriangle size={14} className="text-orange-400" />,
  failing: <XCircle size={14} className="text-red-400" />,
  stale: <Clock size={14} className="text-blue-400" />,
  paused: <Pause size={14} className="text-yellow-400" />,
  archived: <Archive size={14} className="text-zinc-500" />,
  draft: <Clock size={14} className="text-zinc-500" />,
};

const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  high: "text-red-400 bg-red-400/10",
};

function CreateWorkflowModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", description: "", category: "General", prompt: "", persona: "",
    model: "claude-sonnet-4-6", risk_level: "low", stale_after_days: 7, notes: "", expected_output: ""
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { toast.success("Workflow created"); onCreated(); onClose(); }
      else throw new Error("Failed");
    } catch { toast.error("Failed to create workflow"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90dvh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold">New Workflow</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Define a repeatable AI workflow</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Name *</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Weekly Business Brief" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Category</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Research" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Risk Level</label>
              <select className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.risk_level} onChange={e => setForm(p => ({ ...p, risk_level: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Persona</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.persona} onChange={e => setForm(p => ({ ...p, persona: e.target.value }))} placeholder="Analyst" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Model</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="claude-sonnet-4-6" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Stale after (days)</label>
              <input type="number" min="1" className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.stale_after_days} onChange={e => setForm(p => ({ ...p, stale_after_days: parseInt(e.target.value) || 7 })) } />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What this workflow does..." />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Prompt *</label>
              <textarea className="w-full h-32 px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
                value={form.prompt} onChange={e => setForm(p => ({ ...p, prompt: e.target.value }))} placeholder="You are a... Your task is to..." />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Expected Output</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.expected_output} onChange={e => setForm(p => ({ ...p, expected_output: e.target.value }))} placeholder="e.g. Summary report under 500 words" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-secondary text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Creating..." : "Create Workflow"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) setWorkflows(await res.json());
      else toast.error("Failed to load workflows");
    } catch { toast.error("Failed to load workflows"); }
    finally { setLoading(false); }
  }

  const filtered = workflows.filter(w => {
    const q = search.toLowerCase();
    const matchText = !q || w.name.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q) || w.category?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || w.status === statusFilter || w.healthState === statusFilter;
    return matchText && matchStatus;
  });

  const counts = { all: workflows.length, active: workflows.filter(w => w.status === "active").length, stale: workflows.filter(w => w.healthState === "stale").length, failing: workflows.filter(w => w.healthState === "failing").length };

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Repeatable AI workflows — prompts, personas, and run history</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={14} /> New Workflow
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows..."
            className="pl-8 pr-3 h-8 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-52" />
        </div>
        {[
          { k: "all", label: `All (${counts.all})` },
          { k: "active", label: `Active (${counts.active})` },
          { k: "stale", label: `Stale (${counts.stale})` },
          { k: "failing", label: `Failing (${counts.failing})` },
          { k: "paused", label: "Paused" },
          { k: "archived", label: "Archived" },
        ].map(f => (
          <button key={f.k} onClick={() => setStatusFilter(f.k)}
            className={cn("px-2.5 py-1 text-xs rounded-md border transition-colors",
              statusFilter === f.k ? "bg-primary/20 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
        <div className="border border-border rounded-lg px-4 py-10 text-center text-sm text-muted-foreground">
          <Workflow size={24} className="mx-auto mb-2 opacity-30" />
          No workflows found
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_80px_100px_80px_120px] gap-0 px-4 py-2 bg-secondary/30 border-b border-border text-xs text-muted-foreground font-medium">
              <span>Workflow</span><span>Category</span><span>Risk</span><span>Health</span><span>Success</span><span>Last Run</span>
            </div>
            {filtered.map(w => (
              <Link key={w.id} to={`/workflows/${w.id}`}
                className="grid grid-cols-[1fr_100px_80px_100px_80px_120px] gap-0 px-4 py-3 border-b border-border hover:bg-white/5 transition-colors items-center last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{w.name}</p>
                  {w.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{w.description}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{w.category}</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium w-fit", RISK_COLORS[w.risk_level] || "")}>{w.risk_level}</span>
                <div className="flex items-center gap-1.5">
                  {HEALTH_ICONS[w.healthState] || HEALTH_ICONS.healthy}
                  <span className={cn("text-xs", STATUS_COLORS[w.healthState]?.split(" ")[0] || "text-muted-foreground")}>{statusLabel(w.healthState)}</span>
                </div>
                <span className="text-xs text-muted-foreground">{w.success_rate !== null ? `${Math.round(w.success_rate * 100)}%` : "—"}</span>
                <span className="text-xs text-muted-foreground">{fmtRelative(w.last_run_at)}</span>
              </Link>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map(w => (
              <Link key={w.id} to={`/workflows/${w.id}`}
                className="block border border-border rounded-lg p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium leading-snug flex-1 min-w-0">{w.name}</p>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0", RISK_COLORS[w.risk_level] || "")}>{w.risk_level}</span>
                </div>
                {w.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{w.description}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    {HEALTH_ICONS[w.healthState] || HEALTH_ICONS.healthy}
                    <span className={cn(STATUS_COLORS[w.healthState]?.split(" ")[0] || "text-muted-foreground")}>{statusLabel(w.healthState)}</span>
                  </div>
                  {w.category && <span>{w.category}</span>}
                  {w.success_rate !== null && <span>{Math.round(w.success_rate * 100)}% success</span>}
                  <span>{fmtRelative(w.last_run_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      {showCreate && <CreateWorkflowModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
