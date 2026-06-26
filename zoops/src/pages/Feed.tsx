import { useEffect, useState, useRef } from "react";
import { RefreshCw, Search, ChevronDown, ChevronUp, Rss, X } from "lucide-react";
import { cn, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

interface FeedRun {
  id: string;
  workflow_id: string;
  workflow_name: string;
  output: string;
  summary: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface WorkflowOption {
  workflow_id: string;
  workflow_name: string;
}

function OutputCard({ run }: { run: FeedRun }) {
  const [expanded, setExpanded] = useState(false);
  const preview = run.output?.slice(0, 280) ?? "";
  const hasMore = (run.output?.length ?? 0) > 280;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{run.workflow_name}</span>
            <span className={cn("status-badge border shrink-0", STATUS_COLORS[run.status] || STATUS_COLORS.pending)}>
              {statusLabel(run.status)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtRelative(run.created_at)}</p>
        </div>
        {run.summary && (
          <p className="text-xs text-muted-foreground italic max-w-xs truncate shrink-0 hidden sm:block">{run.summary}</p>
        )}
      </div>

      <div className="px-4 py-3">
        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
          {expanded ? run.output : preview}
          {!expanded && hasMore && <span className="text-zinc-600">…</span>}
        </pre>
        {hasMore && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded
              ? <><ChevronUp size={12} /> Show less</>
              : <><ChevronDown size={12} /> Show {run.output.length - 280 > 0 ? `${(run.output.length - 280).toLocaleString()} more chars` : "more"}</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [runs, setRuns] = useState<FeedRun[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { load(); }, [workflowFilter]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(), 350);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (workflowFilter) params.set("workflowId", workflowFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/feed?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRuns(data.runs);
      setWorkflows(data.workflows);
    } catch (e: any) {
      toast.error(`Failed to load feed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Rss size={18} className="text-primary" /> Intelligence Feed
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Run outputs from your automations and workflows
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted disabled:opacity-50 transition-colors shrink-0"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search output content…"
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>
        <select
          value={workflowFilter}
          onChange={e => setWorkflowFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground min-w-[180px]"
        >
          <option value="">All workflows</option>
          {workflows.map(w => (
            <option key={w.workflow_id} value={w.workflow_id}>{w.workflow_name}</option>
          ))}
        </select>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <Rss size={28} className="text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || workflowFilter ? "No results match your filters." : "No run outputs yet. Paste output into a run to see it here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map(run => <OutputCard key={run.id} run={run} />)}
        </div>
      )}
    </div>
  );
}
