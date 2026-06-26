import { useEffect, useState } from "react";
import { RefreshCw, Plus, Minus, GitCompare, ChevronDown, ChevronUp } from "lucide-react";
import { cn, fmtRelative } from "@/lib/utils";
import { toast } from "sonner";

interface ScanDelta {
  id: string;
  scan_at: string;
  total_count: number;
  added_count: number;
  removed_count: number;
  items_added: Array<{ type: string; name: string; path: string }>;
  items_removed: Array<{ type: string; name: string; path: string }>;
}

const TYPE_COLOR: Record<string, string> = {
  "zo-site": "text-blue-400",
  "database": "text-purple-400",
  "skill": "text-emerald-400",
  "zo-services": "text-cyan-400",
  "project": "text-orange-400",
  "node-project": "text-yellow-400",
  "python-project": "text-yellow-400",
  "env-config": "text-zinc-400",
  "network": "text-zinc-400",
  "recent-changes": "text-zinc-400",
};

function typeLabel(t: string) {
  return t.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function DeltaCard({ delta }: { delta: ScanDelta }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = delta.items_added.length > 0 || delta.items_removed.length > 0;
  const isClean = delta.added_count === 0 && delta.removed_count === 0;

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      isClean ? "border-border" : delta.added_count > 0 || delta.removed_count > 0 ? "border-border" : "border-border"
    )} style={{ background: "var(--card)" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="shrink-0">
          <GitCompare size={14} className="text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-sm font-medium">{fmtRelative(delta.scan_at)}</span>
            <span className="text-xs text-muted-foreground">{delta.total_count} items total</span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            {delta.added_count > 0 ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <Plus size={11} /> {delta.added_count} added
              </span>
            ) : null}
            {delta.removed_count > 0 ? (
              <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                <Minus size={11} /> {delta.removed_count} removed
              </span>
            ) : null}
            {isClean && (
              <span className="text-xs text-muted-foreground">No changes</span>
            )}
          </div>
        </div>

        {hasDetails && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {delta.items_added.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1">
                <Plus size={11} /> Added
              </p>
              <ul className="space-y-1">
                {delta.items_added.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className={cn("shrink-0 font-medium", TYPE_COLOR[item.type] || "text-muted-foreground")}>
                      {typeLabel(item.type)}
                    </span>
                    <span className="text-muted-foreground truncate">{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {delta.items_removed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-400 mb-1.5 flex items-center gap-1">
                <Minus size={11} /> Removed
              </p>
              <ul className="space-y-1">
                {delta.items_removed.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className={cn("shrink-0 font-medium", TYPE_COLOR[item.type] || "text-muted-foreground")}>
                      {typeLabel(item.type)}
                    </span>
                    <span className="text-muted-foreground truncate">{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChangelogPage() {
  const [deltas, setDeltas] = useState<ScanDelta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/changelog");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeltas(await res.json());
    } catch (e: any) {
      toast.error(`Failed to load changelog: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const totalAdded = deltas.reduce((s, d) => s + d.added_count, 0);
  const totalRemoved = deltas.reduce((s, d) => s + d.removed_count, 0);

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GitCompare size={18} className="text-primary" /> Workspace Changelog
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Diff between discovery scans — what was added or removed from your workspace
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

      {!loading && deltas.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Plus size={13} /> {totalAdded} total additions
          </span>
          <span className="flex items-center gap-1.5 text-red-400 font-medium">
            <Minus size={13} /> {totalRemoved} total removals
          </span>
          <span className="text-muted-foreground">{deltas.length} scan{deltas.length !== 1 ? "s" : ""} recorded</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : deltas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <GitCompare size={28} className="text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No scan history yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Run a second discovery scan from the Command Center to start recording workspace changes.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {deltas.map(d => <DeltaCard key={d.id} delta={d} />)}
        </div>
      )}
    </div>
  );
}
