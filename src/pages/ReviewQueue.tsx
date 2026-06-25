import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, AlertTriangle, XCircle, CheckCircle2, Clock, RefreshCw, ChevronRight } from "lucide-react";
import { cn, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

interface ReviewItem {
  id: string;
  type: string;
  ref_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  notes: string | null;
  created_at: string;
}

interface ReviewRun {
  id: string;
  workflow_name: string;
  summary: string | null;
  status: string;
  review_status: string | null;
  created_at: string;
  error: string | null;
}

export default function ReviewQueuePage() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [runs, setRuns] = useState<ReviewRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setReviewItems(data.reviewItems || []);
      setRuns(data.needsReviewRuns || []);
    } catch {
      toast.error("Failed to load review queue");
    } finally {
      setLoading(false);
    }
  }

  async function resolveItem(id: string) {
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (!res.ok) throw new Error();
      setReviewItems(prev => prev.filter(i => i.id !== id));
      toast.success("Marked resolved");
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function approveRun(id: string) {
    try {
      const res = await fetch(`/api/runs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status: "approved" }),
      });
      if (!res.ok) throw new Error();
      setRuns(prev => prev.filter(r => r.id !== id));
      toast.success("Run approved");
    } catch {
      toast.error("Failed to update run");
    }
  }

  const total = reviewItems.length + runs.length;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Inbox size={18} className="text-primary" /> Review Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Items and runs that need your attention
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw size={14} className="animate-spin" /> Loading...
        </div>
      ) : total === 0 ? (
        <div className="border border-border rounded-lg px-4 py-14 text-center space-y-2">
          <CheckCircle2 size={28} className="mx-auto text-emerald-400 opacity-60" />
          <p className="text-sm font-medium">Queue is clear</p>
          <p className="text-xs text-muted-foreground">No items or runs need review right now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Review items */}
          {reviewItems.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Review Items ({reviewItems.length})
              </h2>
              <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                {reviewItems.map(item => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{fmtRelative(item.created_at)}</span>
                        {item.type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                            {item.type}
                          </span>
                        )}
                        {item.priority > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                            priority {item.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => resolveItem(item.id)}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <CheckCircle2 size={11} /> Resolve
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Runs needing review */}
          {runs.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Runs Needing Review ({runs.length})
              </h2>
              <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                {runs.map(run => (
                  <div key={run.id} className="flex items-start gap-3 px-4 py-3">
                    {run.status === "failed"
                      ? <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      : <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{run.workflow_name}</p>
                      {run.summary && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{run.summary}</p>
                      )}
                      {run.error && (
                        <p className="text-xs text-red-400/80 mt-0.5 font-mono line-clamp-1">{run.error}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{fmtRelative(run.created_at)}</span>
                        <span className={cn("status-badge border text-[10px]", STATUS_COLORS[run.status] || STATUS_COLORS.pending)}>
                          {statusLabel(run.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => approveRun(run.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle2 size={11} /> Approve
                      </button>
                      <Link
                        to={`/runs/${run.id}`}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View <ChevronRight size={11} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
