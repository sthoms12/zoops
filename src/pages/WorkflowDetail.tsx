import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Clock, CheckCircle2, XCircle, AlertTriangle, Copy, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn, fmtDateTime, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewRun, setShowNewRun] = useState(false);
  const [showPromptHistory, setShowPromptHistory] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const res = await fetch(`/api/workflows/${id}`);
      if (res.ok) setData(await res.json());
      else toast.error("Workflow not found");
    } catch {}
    finally { setLoading(false); }
  }

  async function deleteWorkflow() {
    if (!confirm(`Delete "${data.name}"? This will also delete all runs and prompt history.`)) return;
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete workflow"); return; }
      toast.success("Workflow deleted");
      navigate("/workflows");
    } catch { toast.error("Failed to delete workflow"); }
  }

  async function updateStatus(status: string) {
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status }),
      });
      if (!res.ok) { toast.error("Failed to update status"); return; }
      toast.success(`Status set to ${status}`);
      load();
    } catch { toast.error("Failed to update status"); }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  if (!data) return <div className="p-6 text-sm text-red-400">Workflow not found</div>;

  const successRate = data.success_rate !== null ? Math.round(data.success_rate * 100) : null;

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/workflows" className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"><ArrowLeft size={18} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold truncate">{data.name}</h1>
            <span className={cn("status-badge border", STATUS_COLORS[data.healthState] || STATUS_COLORS.healthy)}>{statusLabel(data.healthState)}</span>
            <span className={cn("status-badge border", STATUS_COLORS[data.status] || STATUS_COLORS.active)}>{statusLabel(data.status)}</span>
          </div>
          {data.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{data.description}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {data.status === "active" && <button onClick={() => updateStatus("paused")} className="flex-1 min-w-[120px] px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary text-muted-foreground">Pause</button>}
        {data.status === "paused" && <button onClick={() => updateStatus("active")} className="flex-1 min-w-[120px] px-3 py-1.5 text-xs rounded-md border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400">Resume</button>}
        <button onClick={() => setShowNewRun(true)} className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
          <Play size={12} /> New Run
        </button>
        <button onClick={deleteWorkflow} className="px-3 py-1.5 text-xs rounded-md border border-red-500/20 hover:bg-red-500/10 text-red-400">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Category", value: data.category || "—" },
          { label: "Risk Level", value: data.risk_level || "low" },
          { label: "Persona", value: data.persona || "Default" },
          { label: "Model", value: data.model || "Default" },
          { label: "Success Rate", value: successRate !== null ? `${successRate}%` : "—" },
          { label: "Failure Count", value: data.failure_count ?? 0 },
          { label: "Last Run", value: fmtRelative(data.last_run_at) },
          { label: "Stale After", value: `${data.stale_after_days || 7} days` },
        ].map(m => (
          <div key={m.label} className="bg-card border border-border rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
            <p className="text-sm font-medium mt-0.5 truncate">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Prompt */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Current Prompt (v{data.promptVersions?.length || 1})</span>
          <div className="flex items-center gap-2">
            <button onClick={() => { navigator.clipboard.writeText(data.prompt); toast.success("Copied!"); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Copy size={12} /> Copy
            </button>
            <button onClick={() => setShowPromptHistory(!showPromptHistory)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              History {showPromptHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>
        <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">{data.prompt || "(no prompt set)"}</pre>
      </div>

      {/* Prompt history */}
      {showPromptHistory && (data.promptVersions?.length ?? 0) > 0 && (
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-medium">Prompt History</span>
          </div>
          <div className="divide-y divide-border">
            {data.promptVersions.map((pv: any) => (
              <div key={pv.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-medium">v{pv.version}</span>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {pv.change_note && <span className="text-xs text-muted-foreground line-clamp-1">{pv.change_note}</span>}
                    <span className="text-xs text-zinc-600 shrink-0">{fmtDateTime(pv.created_at)}</span>
                    <button onClick={() => { navigator.clipboard.writeText(pv.prompt); toast.success("Copied!"); }} className="text-xs text-muted-foreground hover:text-foreground shrink-0"><Copy size={11} /></button>
                  </div>
                </div>
                <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap line-clamp-4">{pv.prompt}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expected output / notes */}
      {(data.expected_output || data.notes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.expected_output && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Expected Output</p>
              <p className="text-sm">{data.expected_output}</p>
            </div>
          )}
          {data.notes && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{data.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Run history */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Recent Runs</span>
          <Link to={`/runs?workflowId=${id}`} className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
        </div>
        {(data.runs?.length ?? 0) === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No runs yet</div>
        ) : (
          <div className="divide-y divide-border">
            {data.runs.slice(0, 8).map((run: any) => (
              <Link key={run.id} to={`/runs/${run.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                {run.status === "completed" ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> :
                 run.status === "failed" ? <XCircle size={13} className="text-red-400 shrink-0" /> :
                 <AlertTriangle size={13} className="text-orange-400 shrink-0" />}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{run.summary || run.notes || "(no summary)"}</p>
                </div>
                <span className={cn("status-badge border text-[10px]", STATUS_COLORS[run.status] || "")}>{statusLabel(run.status)}</span>
                <span className="text-[11px] text-zinc-600">{fmtRelative(run.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showNewRun && <NewRunModal workflowId={id!} workflowName={data.name} prompt={data.prompt} onClose={() => setShowNewRun(false)} onCreated={load} />}
    </div>
  );
}

function NewRunModal({ workflowId, workflowName, prompt, onClose, onCreated }: any) {
  const [output, setOutput] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState("completed");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_id: workflowId, workflow_name: workflowName, input_prompt: prompt, output, summary, status, started_at: new Date().toISOString() }),
      });
      if (!res.ok) { toast.error("Failed to record run"); return; }
      toast.success("Run recorded");
      onCreated();
      onClose();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90dvh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold">Capture Run — {workflowName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Copy the prompt below, run it in Zo, then paste the output here.</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Prompt (copy to Zo)</label>
              <button onClick={() => { navigator.clipboard.writeText(prompt); toast.success("Copied!"); }} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Copy size={11} /> Copy Prompt
              </button>
            </div>
            <pre className="text-[11px] font-mono text-muted-foreground bg-secondary/30 border border-border rounded-md p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">{prompt}</pre>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Zo Output (paste here)</label>
              <textarea value={output} onChange={e => setOutput(e.target.value)}
                className="w-full h-40 px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
                placeholder="Paste Zo's response here..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Summary</label>
              <input value={summary} onChange={e => setSummary(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="One-line summary of the output" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="completed">Completed</option>
                <option value="needs_review">Needs Review</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-secondary text-muted-foreground">Cancel</button>
              <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Save Run</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
