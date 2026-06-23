import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Play, CheckCircle2, XCircle, Clock, AlertTriangle, Search } from "lucide-react";
import { cn, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

function RunIcon({ status }: { status: string }) {
  switch (status) {
    case "completed": return <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />;
    case "failed": return <XCircle size={13} className="text-red-400 shrink-0" />;
    case "needs_review": return <AlertTriangle size={13} className="text-orange-400 shrink-0" />;
    case "in_progress": return <Clock size={13} className="text-blue-400 shrink-0" />;
    default: return <Clock size={13} className="text-zinc-500 shrink-0" />;
  }
}

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const wfId = searchParams.get("workflowId");
    const url = wfId ? `/api/runs?workflowId=${wfId}&limit=100` : "/api/runs?limit=100";
    setLoading(true);
    fetch(url).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(setRuns)
      .catch(() => toast.error("Failed to load runs")).finally(() => setLoading(false));
  }, [searchParams]);

  const filtered = runs.filter(r => {
    const q = search.toLowerCase();
    const matchText = !q || r.workflow_name?.toLowerCase().includes(q) || r.summary?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchText && matchStatus;
  });

  const counts = {
    all: runs.length,
    completed: runs.filter(r => r.status === "completed").length,
    failed: runs.filter(r => r.status === "failed").length,
    needs_review: runs.filter(r => r.status === "needs_review").length,
    pending: runs.filter(r => r.status === "pending").length,
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold">Runs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Execution history — completed, failed, and pending review</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search runs..."
            className="pl-8 pr-3 h-8 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48" />
        </div>
        {([
          ["all", `All (${counts.all})`], ["completed", `Completed (${counts.completed})`],
          ["failed", `Failed (${counts.failed})`], ["needs_review", `Review (${counts.needs_review})`],
          ["pending", `Pending (${counts.pending})`],
        ] as [string, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setStatusFilter(k)}
            className={cn("px-2.5 py-1 text-xs rounded-md border transition-colors",
              statusFilter === k ? "bg-primary/20 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
        <div className="border border-border rounded-lg px-4 py-10 text-center text-sm text-muted-foreground">
          <Play size={24} className="mx-auto mb-2 opacity-30" /> No runs found
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_160px_100px_120px] gap-0 px-4 py-2 bg-secondary/30 border-b border-border text-xs text-muted-foreground font-medium">
              <span className="w-5" /><span>Workflow / Summary</span><span>Review Status</span><span>Status</span><span>When</span>
            </div>
            {filtered.map(run => (
              <Link key={run.id} to={`/runs/${run.id}`}
                className="grid grid-cols-[auto_1fr_160px_100px_120px] gap-0 px-4 py-3 border-b border-border hover:bg-white/5 transition-colors items-center last:border-0">
                <span className="mr-3"><RunIcon status={run.status} /></span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{run.workflow_name}</p>
                  {run.summary && <p className="text-xs text-muted-foreground truncate mt-0.5">{run.summary}</p>}
                </div>
                <span className={cn("status-badge border text-[10px] w-fit", STATUS_COLORS[run.review_status] || STATUS_COLORS.pending)}>
                  {statusLabel(run.review_status || "pending")}
                </span>
                <span className={cn("status-badge border text-[10px] w-fit", STATUS_COLORS[run.status] || STATUS_COLORS.pending)}>
                  {statusLabel(run.status)}
                </span>
                <span className="text-xs text-muted-foreground">{fmtRelative(run.created_at)}</span>
              </Link>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map(run => (
              <Link key={run.id} to={`/runs/${run.id}`}
                className="flex gap-3 border border-border rounded-lg p-4 hover:bg-white/5 transition-colors items-start">
                <div className="mt-0.5 shrink-0"><RunIcon status={run.status} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{run.workflow_name}</p>
                  {run.summary && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{run.summary}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={cn("status-badge border text-[10px]", STATUS_COLORS[run.status] || STATUS_COLORS.pending)}>
                      {statusLabel(run.status)}
                    </span>
                    {run.review_status && (
                      <span className={cn("status-badge border text-[10px]", STATUS_COLORS[run.review_status] || STATUS_COLORS.pending)}>
                        {statusLabel(run.review_status)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{fmtRelative(run.created_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
