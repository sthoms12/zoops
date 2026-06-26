import { useEffect, useState } from "react";
import { RefreshCw, Search, Database, Code2, FileCode, HardDrive, Globe, BookOpen, Wifi, Server } from "lucide-react";
import { cn, fmtRelative } from "@/lib/utils";
import { toast } from "sonner";

interface DiscoveryItem {
  id: string;
  type: string;
  name: string;
  path?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | string | null;
  last_seen_at: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  "zo-site": <Globe size={14} className="text-primary" />,
  "zo-services": <Server size={14} className="text-blue-400" />,
  "node-project": <Code2 size={14} className="text-yellow-400" />,
  "python-project": <FileCode size={14} className="text-blue-400" />,
  "database": <Database size={14} className="text-emerald-400" />,
  "skill": <BookOpen size={14} className="text-purple-400" />,
  "project": <HardDrive size={14} className="text-zinc-400" />,
  "env-config": <FileCode size={14} className="text-orange-400" />,
  "recent-changes": <RefreshCw size={14} className="text-yellow-400" />,
  "network": <Wifi size={14} className="text-blue-400" />,
};

const TYPE_LABELS: Record<string, string> = {
  "zo-site": "Zo Site",
  "zo-services": "Zo Services",
  "node-project": "Node/Bun Project",
  "python-project": "Python Project",
  "database": "Database",
  "skill": "Skill",
  "project": "Project",
  "env-config": "Env Config",
  "recent-changes": "Recent Changes",
  "network": "Network",
};

function ItemCard({ item }: { item: DiscoveryItem }) {
  const [expanded, setExpanded] = useState(false);
  let meta: Record<string, unknown> = {};
  try { meta = typeof item.metadata === "string" ? JSON.parse(item.metadata || "{}") : (item.metadata || {}); } catch {}

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 shrink-0">{TYPE_ICONS[item.type] || <HardDrive size={14} className="text-zinc-500" />}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{item.name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
              {TYPE_LABELS[item.type] || item.type}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
          {item.path && (
            <p className="text-[10px] text-zinc-600 mt-0.5 font-mono truncate">{item.path.replace("/home/workspace/", "workspace/")}</p>
          )}
        </div>
        <span className="text-[10px] text-zinc-600 shrink-0">{fmtRelative(item.last_seen_at)}</span>
      </div>
      {expanded && Object.keys(meta).length > 0 && (
        <div className="border-t border-border px-3 py-3 bg-secondary/30">
          <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function DiscoveryPage() {
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    loadItems();
    const interval = setInterval(() => loadItems(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadItems(quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/discovery");
      if (res.ok) setItems(await res.json() as DiscoveryItem[]);
    } catch { if (!quiet) toast.error("Failed to load discovery items"); }
    finally { if (!quiet) setLoading(false); }
  }

  async function runScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/discovery/scan", { method: "POST" });
      if (!res.ok) { toast.error("Scan failed"); return; }
      const d = await res.json();
      toast.success(`Scan complete — ${d.count} items discovered`);
      loadItems();
    } catch { toast.error("Scan failed"); }
    finally { setScanning(false); }
  }

  const types = ["all", ...Array.from(new Set(items.map(i => i.type)))];

  const filtered = items.filter(i => {
    const q = filter.toLowerCase();
    const matchesText = !q || i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || i.path?.toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || i.type === typeFilter;
    return matchesText && matchesType;
  });

  const byType = filtered.reduce<Record<string, DiscoveryItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Discovery</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Auto-detected local projects, services, databases, and files</p>
        </div>
        <button onClick={runScan} disabled={scanning} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary hover:bg-secondary/80 text-foreground border border-border disabled:opacity-50 transition-colors">
          <RefreshCw size={12} className={scanning ? "animate-spin" : ""} /> {scanning ? "Scanning..." : "Re-scan"}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{items.length}</span> items discovered
        <span>·</span>
        <span className="font-medium text-foreground">{Object.keys(byType).length}</span> types
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter items..."
            className="w-full pl-8 pr-3 h-8 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={cn("px-2 py-1 text-xs rounded-md border transition-colors",
                typeFilter === t ? "bg-primary/20 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
              {TYPE_LABELS[t] || (t === "all" ? "All" : t)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
          <RefreshCw size={14} className="animate-spin" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search size={24} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No items found. Try running a scan.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byType).map(([type, typeItems]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                {TYPE_ICONS[type] || <HardDrive size={13} className="text-zinc-500" />}
                <h3 className="text-sm font-medium">{TYPE_LABELS[type] || type}</h3>
                <span className="text-xs text-muted-foreground">({typeItems.length})</span>
              </div>
              <div className="space-y-2">
                {typeItems.map(item => <ItemCard key={item.id} item={item} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
