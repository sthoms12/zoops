import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, CheckCircle2, Save } from "lucide-react";
import { cn, fmtDateTime, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ output: "", summary: "", notes: "", reviewer_notes: "", status: "", review_status: "" });

  useEffect(() => {
    fetch(`/api/runs/${id}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => {
        setRun(d);
        setForm({ output: d.output || "", summary: d.summary || "", notes: d.notes || "", reviewer_notes: d.reviewer_notes || "", status: d.status, review_status: d.review_status || "pending" });
      })
      .catch(() => toast.error("Run not found"))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    try {
      const res = await fetch(`/api/runs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      toast.success("Run updated");
      setRun({ ...run, ...form });
      setEditing(false);
    } catch { toast.error("Failed to save"); }
  }

  async function markReviewed(review_status: string) {
    try {
      const res = await fetch(`/api/runs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status }),
      });
      if (!res.ok) { toast.error("Failed to update review status"); return; }
      setRun({ ...run, review_status });
      setForm(f => ({ ...f, review_status }));
      toast.success(`Marked as ${review_status}`);
    } catch { toast.error("Failed to update review status"); }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  if (!run) return <div className="p-6 text-sm text-red-400">Run not found</div>;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-start gap-3 flex-wrap">
        <Link to="/runs" className="text-muted-foreground hover:text-foreground shrink-0 mt-1"><ArrowLeft size={18} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold truncate">{run.workflow_name}</h1>
            <span className={cn("status-badge border", STATUS_COLORS[run.status] || "")}>{statusLabel(run.status)}</span>
            <span className={cn("status-badge border", STATUS_COLORS[run.review_status] || STATUS_COLORS.pending)}>{statusLabel(run.review_status || "pending")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtDateTime(run.created_at)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {run.review_status === "pending" && (
          <>
            <button onClick={() => markReviewed("approved")} className="flex-1 min-w-[100px] px-3 py-1.5 text-xs rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30">Approve</button>
            <button onClick={() => markReviewed("rejected")} className="flex-1 min-w-[100px] px-3 py-1.5 text-xs rounded-md bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20">Reject</button>
          </>
        )}
        <button onClick={() => setEditing(!editing)} className="flex-1 min-w-[100px] px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary text-muted-foreground">
          {editing ? "Cancel" : "Edit"}
        </button>
        {editing && <button onClick={save} className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"><Save size={12} /> Save</button>}
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Started", value: fmtDateTime(run.started_at) },
          { label: "Completed", value: fmtDateTime(run.completed_at) },
          { label: "Duration", value: run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—" },
          { label: "Reviewed", value: fmtDateTime(run.reviewed_at) },
        ].map(m => (
          <div key={m.label} className="bg-card border border-border rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
            <p className="text-xs font-medium mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Input prompt */}
      {run.input_prompt && (
        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium">Input Prompt</span>
            <button onClick={() => { navigator.clipboard.writeText(run.input_prompt); toast.success("Copied!"); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Copy size={11} /> Copy</button>
          </div>
          <pre className="p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">{run.input_prompt}</pre>
        </div>
      )}

      {/* Output */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Output</span>
          {run.output && <button onClick={() => { navigator.clipboard.writeText(run.output); toast.success("Copied!"); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Copy size={11} /> Copy</button>}
        </div>
        {editing ? (
          <div className="p-4">
            <textarea value={form.output} onChange={e => setForm(f => ({ ...f, output: e.target.value }))}
              className="w-full h-48 px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
              placeholder="Paste Zo output here..." />
          </div>
        ) : (
          <div className="p-4">
            {run.output ? (
              <pre className="text-sm whitespace-pre-wrap text-foreground overflow-x-auto max-h-96 overflow-y-auto">{run.output}</pre>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No output captured yet.</p>
                <button onClick={() => setEditing(true)} className="mt-2 text-xs text-primary hover:underline">Paste output →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <label className="text-xs text-muted-foreground block mb-2">Summary</label>
          {editing ? (
            <input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="One-line summary" />
          ) : <p className="text-sm">{run.summary || <span className="text-muted-foreground">—</span>}</p>}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <label className="text-xs text-muted-foreground block mb-2">Reviewer Notes</label>
          {editing ? (
            <textarea value={form.reviewer_notes} onChange={e => setForm(f => ({ ...f, reviewer_notes: e.target.value }))}
              className="w-full h-20 px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Notes for review..." />
          ) : <p className="text-sm">{run.reviewer_notes || <span className="text-muted-foreground">—</span>}</p>}
        </div>
      </div>

      {editing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              {["pending", "in_progress", "completed", "failed", "needs_review"].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Review Status</label>
            <select value={form.review_status} onChange={e => setForm(f => ({ ...f, review_status: e.target.value }))}
              className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              {["pending", "approved", "rejected", "needs_revision"].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>
        </div>
      )}

      {run.error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <p className="text-xs text-red-400 font-medium mb-1">Error</p>
          <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">{run.error}</pre>
        </div>
      )}
    </div>
  );
}
