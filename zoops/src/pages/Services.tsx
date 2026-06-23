import { useEffect, useState } from "react";
import { Server, Plus, RefreshCw, CheckCircle2, AlertCircle, XCircle, HelpCircle, ExternalLink } from "lucide-react";
import { cn, fmtRelative, STATUS_COLORS, statusLabel } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  "zo-site": "Zo Site", "zo-space": "Zo Space", "service": "Service", "database": "Database",
  "script": "Script", "tunnel": "Tunnel", "mcp-server": "MCP Server", "platform": "Platform",
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

function ServiceRow({ svc, onCheck, onDelete }: { svc: any; onCheck: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-white/5 transition-colors">
      <StatusIcon status={svc.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{svc.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{TYPE_LABELS[svc.type] || svc.type}</span>
          {svc.is_auto_detected ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">auto-detected</span>
          ) : null}
        </div>
        {svc.path && <p className="text-[11px] text-zinc-600 font-mono truncate mt-0.5">{svc.path.replace("/home/workspace/", "workspace/").replace("/dev/shm/", "shm/")}</p>}
        {svc.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{svc.notes}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {svc.port && <span className="text-xs text-muted-foreground font-mono">:{svc.port}</span>}
        {svc.endpoint && (
          <a href={svc.endpoint} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            <ExternalLink size={13} />
          </a>
        )}
        <span className="text-xs text-zinc-600">{fmtRelative(svc.last_checked_at)}</span>
        <span className={cn("status-badge border", STATUS_COLORS[svc.status] || STATUS_COLORS.unknown)}>{statusLabel(svc.status)}</span>
        <button onClick={() => onCheck(svc.id)} className="text-xs px-2 py-1 rounded border border-border hover:bg-secondary transition-colors text-muted-foreground">Check</button>
        {!svc.is_auto_detected && (
          <button onClick={() => onDelete(svc.id)} className="text-xs px-2 py-1 rounded border border-red-500/20 hover:bg-red-500/10 text-red-400 transition-colors">Remove</button>
        )}
      </div>
    </div>
  );
}

function AddServiceModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: "", type: "service", endpoint: "", port: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, port: form.port ? parseInt(form.port) : null }),
      });
      if (!res.ok) { toast.error("Failed to add service"); return; }
      toast.success("Service added");
      onAdded();
      onClose();
    } catch { toast.error("Failed to add service"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold">Register Service</h3>
        <form onSubmit={submit} className="space-y-3">
          {[
            { label: "Name *", key: "name", placeholder: "m365-barometer" },
            { label: "Endpoint", key: "endpoint", placeholder: "https://..." },
            { label: "Port", key: "port", placeholder: "51017" },
            { label: "Notes", key: "notes", placeholder: "Optional notes" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
              <input className="w-full h-8 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder} required={f.key === "name"} />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Type</label>
            <select className="w-full h-8 px-3 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-secondary text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Add Service</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    load();
    const interval = setInterval(quietLoad, 30000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/services");
      if (res.ok) setServices(await res.json());
      else toast.error("Failed to load services");
    } catch { toast.error("Failed to load services"); }
    finally { setLoading(false); }
  }

  async function quietLoad() {
    try {
      const res = await fetch("/api/services");
      if (res.ok) setServices(await res.json());
    } catch {}
  }

  async function checkService(id: string) {
    setChecking(id);
    try {
      const res = await fetch(`/api/services/${id}/check`, { method: "POST" });
      if (!res.ok) { toast.error("Check failed"); return; }
      const d = await res.json();
      toast.success(`${d.status}: ${d.note || "OK"}`);
      load();
    } catch { toast.error("Check failed"); }
    finally { setChecking(null); }
  }

  async function deleteService(id: string) {
    if (!confirm("Remove this service?")) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to remove service"); return; }
      toast.success("Service removed");
      load();
    } catch { toast.error("Failed to remove service"); }
  }

  const autoDetected = services.filter(s => s.is_auto_detected);
  const manual = services.filter(s => !s.is_auto_detected);

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Services</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Detected and registered Zo services, sites, and processes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={12} /> Register
          </button>
        </div>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{services.length}</strong> total</span>
        <span><strong className="text-emerald-400">{services.filter(s => s.status === "healthy").length}</strong> healthy</span>
        <span><strong className="text-yellow-400">{services.filter(s => s.status === "warning").length}</strong> warning</span>
        <span><strong className="text-red-400">{services.filter(s => s.status === "failed").length}</strong> failed</span>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          <Server size={24} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No services detected yet.</p>
          <p className="text-xs mt-1">Run a discovery scan or register manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {autoDetected.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Auto-Detected ({autoDetected.length})</span>
              </div>
              {autoDetected.map(svc => (
                <ServiceRow key={svc.id} svc={svc} onCheck={checkService} onDelete={deleteService} />
              ))}
            </div>
          )}
          {manual.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-secondary/30 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">Registered ({manual.length})</span>
              </div>
              {manual.map(svc => (
                <ServiceRow key={svc.id} svc={svc} onCheck={checkService} onDelete={deleteService} />
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && <AddServiceModal onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}
