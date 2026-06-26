import { useEffect, useState } from "react";
import { Brain, Plus, BookOpen, User, ExternalLink, Pencil, Trash2, Check, X } from "lucide-react";
import { cn, fmtRelative } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  skill: <BookOpen size={14} className="text-purple-400" />,
  persona: <User size={14} className="text-blue-400" />,
};

function EntryRow({ entry, onEdit, onDelete }: { entry: any; onEdit: (e: any) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border hover:bg-white/5 transition-colors">
      <div className="mt-0.5 shrink-0">{TYPE_ICONS[entry.type] || <Brain size={14} className="text-muted-foreground" />}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{entry.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">{entry.type}</span>
          {entry.is_auto_detected ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">auto</span> : null}
        </div>
        {entry.purpose && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.purpose}</p>}
        {entry.path && <p className="text-[10px] font-mono text-zinc-600 mt-0.5 truncate">{entry.path.replace("/home/workspace/", "workspace/")}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {entry.last_reviewed_at && <span className="text-[11px] text-zinc-600">reviewed {fmtRelative(entry.last_reviewed_at)}</span>}
        <button onClick={() => onEdit(entry)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-secondary">
          <Pencil size={12} />
        </button>
        {!entry.is_auto_detected && (
          <button onClick={() => onDelete(entry.id)} className="p-1.5 text-red-400 hover:text-red-300 transition-colors rounded hover:bg-red-500/10">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function EntryModal({ entry, onClose, onSaved }: { entry?: any; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(entry?.id && !entry.is_auto_detected);
  const [form, setForm] = useState({
    type: entry?.type || "skill",
    name: entry?.name || "",
    path: entry?.path || "",
    purpose: entry?.purpose || "",
    notes: entry?.notes || "",
    last_reviewed_at: entry?.last_reviewed_at || "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/skills-personas/${entry.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        });
      } else {
        res = await fetch("/api/skills-personas", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        });
      }
      if (!res.ok) { toast.error("Failed to save"); return; }
      toast.success(isEdit ? "Updated" : "Added");
      onSaved();
      onClose();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold">{isEdit ? "Edit" : "Add"} Skill / Persona</h3>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Type</label>
              <select className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="skill">Skill</option>
                <option value="persona">Persona</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Name *</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="my-skill" required />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Purpose</label>
              <textarea className="w-full h-20 px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} placeholder="What does this skill or persona do?" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">File Path</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.path} onChange={e => setForm(p => ({ ...p, path: e.target.value }))} placeholder="/home/workspace/Skills/..." />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <input className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-secondary text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Saving..." : isEdit ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SkillsPersonas() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/skills-personas");
      if (r.ok) setEntries(await r.json());
      else toast.error("Failed to load skills & personas");
    } catch { toast.error("Failed to load skills & personas"); }
    finally { setLoading(false); }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Remove this entry?")) return;
    try {
      const res = await fetch(`/api/skills-personas/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to remove entry"); return; }
      toast.success("Removed");
      load();
    } catch { toast.error("Failed to remove entry"); }
  }

  function openEdit(entry: any) { setEditEntry(entry); setShowModal(true); }

  const filtered = typeFilter === "all" ? entries : entries.filter(e => e.type === typeFilter);
  const skills = entries.filter(e => e.type === "skill");
  const personas = entries.filter(e => e.type === "persona");

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Skills & Personas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registry of Zo skills and personas in use on this Zo Computer</p>
        </div>
        <button onClick={() => { setEditEntry(null); setShowModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={14} /> Add Entry
        </button>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{skills.length}</strong> skills</span>
        <span><strong className="text-foreground">{personas.length}</strong> personas</span>
        <span><strong className="text-foreground">{entries.filter(e => e.is_auto_detected).length}</strong> auto-detected</span>
      </div>

      <div className="flex gap-1">
        {[["all", "All"], ["skill", "Skills"], ["persona", "Personas"]].map(([k, label]) => (
          <button key={k} onClick={() => setTypeFilter(k)}
            className={cn("px-2.5 py-1 text-xs rounded-md border transition-colors",
              typeFilter === k ? "bg-primary/20 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> :
        filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <Brain size={24} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No entries yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            {filtered.map(entry => (
              <EntryRow key={entry.id} entry={entry} onEdit={openEdit} onDelete={deleteEntry} />
            ))}
          </div>
        )}

      {showModal && <EntryModal entry={editEntry} onClose={() => { setShowModal(false); setEditEntry(null); }} onSaved={load} />}
    </div>
  );
}
