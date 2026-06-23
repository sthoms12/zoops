import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, CheckCircle2, XCircle, MessageSquare, Globe, AlertTriangle } from "lucide-react";
import { cn, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

function ReviewCard({ item, onAction }: { item: any; onAction: () => void }) {
  const [notes, setNotes] = useState(item.notes || "");
  const [saving, setSaving] = useState(false);

  async function act(status: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) { toast.error("Failed to update review"); return; }
      toast.success(status === "approved" ? "Approved" : "Rejected");
      onAction();
    } catch { toast.error("Failed to update review"); }
    finally { setSaving(false); }
  }

  const priorityColor: Record<string, string> = {
    high: "border-red-500/30 bg-red-500/5",
    normal: "border-border bg-card",
    low: "border-border bg-card",
  };

  return (
    <div className={cn("border rounded-lg p-4 space-y-3", priorityColor[item.priority] || priorityColor.normal)}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={15} className={item.priority === "high" ? "text-red-400 shrink-0 mt-0.5" : "text-yellow-400 shrink-0 mt-0.5"} />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{item.title}</span>
            <span className={cn("status-badge border text-[10px]", STATUS_COLORS[item.priority] || STATUS_COLORS.normal)}>{item.priority}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{item.type}</span>
          </div>
          {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
          <p className="text-[11px] text-zinc-600 mt-1">{fmtRelative(item.created_at)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..."
          className="flex-1 h-8 px-3 text-xs bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        <button onClick={() => act("approved")} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50">
          <CheckCircle2 size={11} /> Approve
        </button>
        <button onClick={() => act("rejected")} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-50">
          <XCircle size={11} /> Reject
        </button>
      </div>
    </div>
  );
}

export default function NeedsReview({ onRefresh }: { onRefresh: () => void }) {
  const [data, setData] = useState<{ reviewItems: any[]; needsReviewRuns: any[]; browserSessionIssues: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews");
      if (res.ok) setData(await res.json());
    } catch { toast.error("Failed to load review queue"); }
    finally { setLoading(false); }
  }

  function handleAction() { load(); onRefresh(); }

  const total = (data?.reviewItems.length ?? 0) + (data?.needsReviewRuns.length ?? 0) + (data?.browserSessionIssues.length ?? 0);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Needs Review</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Items requiring human attention — runs, sessions, and workflows</p>
        </div>
        {total > 0 && (
          <span className="px-2.5 py-1 text-sm font-bold rounded-full bg-red-500/20 text-red-400">{total}</span>
        )}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <>
          {total === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 size={32} className="mx-auto mb-4 text-emerald-400/50" />
              <p className="text-base font-medium text-emerald-400">All clear</p>
              <p className="text-sm mt-1">No items need review right now.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Review items */}
              {(data?.reviewItems.length ?? 0) > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Inbox size={14} /> Action Items ({data!.reviewItems.length})
                  </h2>
                  <div className="space-y-3">
                    {data!.reviewItems.map(item => <ReviewCard key={item.id} item={item} onAction={handleAction} />)}
                  </div>
                </div>
              )}

              {/* Failed/review runs */}
              {(data?.needsReviewRuns.length ?? 0) > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} /> Run Outputs Needing Review ({data!.needsReviewRuns.length})
                  </h2>
                  <div className="space-y-2">
                    {data!.needsReviewRuns.map(run => (
                      <Link key={run.id} to={`/runs/${run.id}`}
                        className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-white/5 transition-colors">
                        <AlertTriangle size={14} className={run.status === "failed" ? "text-red-400 shrink-0" : "text-orange-400 shrink-0"} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{run.workflow_name}</p>
                          <p className="text-xs text-muted-foreground">{run.summary || run.notes || "No summary"}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("status-badge border text-[10px]", STATUS_COLORS[run.status] || "")}>{statusLabel(run.status)}</span>
                          <span className="text-[11px] text-zinc-600">{fmtRelative(run.created_at)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Browser session issues */}
              {(data?.browserSessionIssues.length ?? 0) > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Globe size={14} /> Browser Session Issues ({data!.browserSessionIssues.length})
                  </h2>
                  <div className="space-y-2">
                    {data!.browserSessionIssues.map(task => (
                      <Link key={task.id} to="/browser-tasks"
                        className="flex items-center gap-3 p-3 bg-card border border-orange-500/20 rounded-lg hover:bg-orange-500/5 transition-colors">
                        <Globe size={14} className="text-orange-400 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.name}</p>
                          <p className="text-xs text-muted-foreground">{task.site_name} · {task.url}</p>
                        </div>
                        <span className={cn("status-badge border text-[10px]", STATUS_COLORS[task.session_status] || STATUS_COLORS.unknown)}>
                          {statusLabel(task.session_status)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
