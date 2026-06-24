import { useEffect, useState } from "react";
import { Globe, ExternalLink, CheckCircle2, AlertCircle, XCircle, HelpCircle, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  type: string;
  status: string;
  endpoint: string | null;
  port: number | null;
  notes: string | null;
  last_checked_at: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  "zo-site": <Globe size={20} className="text-blue-400" />,
  "zo-space": <Globe size={20} className="text-purple-400" />,
  "space-page": <Globe size={20} className="text-violet-400" />,
  "service": <Globe size={20} className="text-amber-400" />,
};

const TYPE_LABELS: Record<string, string> = {
  "zo-site": "Zo Site",
  "zo-space": "Zo Space",
  "space-page": "Space Page",
  "service": "Service",
  "database": "Database",
  "script": "Script",
  "tunnel": "Tunnel",
  "mcp-server": "MCP Server",
  "platform": "Platform",
  "unknown": "Unknown",
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "healthy": return <CheckCircle2 size={14} className="text-emerald-400" />;
    case "warning": return <AlertCircle size={14} className="text-yellow-400" />;
    case "failed": return <XCircle size={14} className="text-red-400" />;
    case "detected": return <CheckCircle2 size={14} className="text-blue-400" />;
    default: return <HelpCircle size={14} className="text-zinc-500" />;
  }
}

function SiteCard({ svc, onCheck, checking }: { svc: Service; onCheck: (id: string) => void; checking: boolean }) {
  const url = svc.endpoint || null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
      <div className={cn("h-28 flex items-center justify-center relative", url ? "bg-gradient-to-br from-primary/5 to-primary/10" : "bg-muted/30")}>
        <div className="flex flex-col items-center gap-2">
          {TYPE_ICONS[svc.type] || <Globe size={20} className="text-muted-foreground" />}
          <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[svc.type] || svc.type}</span>
        </div>
        {svc.type === "space-page" ? (
          <span className={cn("absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded border", svc.notes === "public" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-muted border-border text-muted-foreground")}>
            {svc.notes === "public" ? "Public" : "Private"}
          </span>
        ) : url ? (
          <div className={cn("absolute top-2 right-2 rounded-full p-1 border", STATUS_COLORS[svc.status] || STATUS_COLORS.unknown)}>
            <StatusIcon status={svc.status} />
          </div>
        ) : (
          <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">Unpublished</span>
        )}
        {svc.port && (
          <span className="absolute bottom-2 left-2 text-[10px] font-mono text-muted-foreground">:{svc.port}</span>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-semibold text-sm truncate">{svc.name}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{statusLabel(svc.status)}</span>
            <span>·</span>
            <span>{fmtRelative(svc.last_checked_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              <ExternalLink size={11} /> Visit
            </a>
          )}
          <button
            onClick={() => onCheck(svc.id)}
            disabled={checking}
            className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded border border-border hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={checking ? "animate-spin" : ""} /> {checking ? "Checking" : "Check"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SitesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    load();
    const interval = setInterval(quietLoad, 30000);
    return () => clearInterval(interval);
  }, []);

  function filterSites(all: Service[]) {
    return all.filter((s: Service) =>
      s.type === "zo-site" ||
      s.type === "zo-space" ||
      s.type === "space-page" ||
      (s.type === "service" && !!s.endpoint)
    );
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/services");
      if (res.ok) setServices(filterSites(await res.json()));
    } catch {
      toast.error("Failed to load sites");
    } finally {
      setLoading(false);
    }
  }

  async function quietLoad() {
    try {
      const res = await fetch("/api/services");
      if (res.ok) setServices(filterSites(await res.json()));
    } catch {}
  }

  async function syncSites() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sites/sync", { method: "POST" });
      const data = await res.json();
      if (data.added?.length > 0) {
        toast.success(`Found ${data.added.length} new site${data.added.length > 1 ? "s" : ""}: ${data.added.join(", ")}`);
      } else {
        toast.success("All sites up to date");
      }
      load();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function checkService(id: string) {
    setChecking(id);
    try {
      const res = await fetch(`/api/services/${id}/check`, { method: "POST" });
      if (!res.ok) {
        toast.error("Check failed");
        return;
      }
      toast.success("Service checked");
      load();
    } catch {
      toast.error("Check failed");
    } finally {
      setChecking(null);
    }
  }

  const published = services.filter(s => !!s.endpoint).length;
  const total = services.length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sites & Services</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${total} total · ${published} published`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncSites}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary disabled:opacity-50"
          >
            <RotateCcw size={12} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync Sites"}
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card h-64 animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Globe size={32} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm text-muted-foreground">No hosted sites detected yet.</p>
          <p className="text-xs mt-1 text-muted-foreground">Sites and services with endpoints will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(svc => (
            <SiteCard key={svc.id} svc={svc} onCheck={checkService} checking={checking === svc.id} />
          ))}
        </div>
      )}
    </div>
  );
}
