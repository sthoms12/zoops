import { useEffect, useState } from "react";
import { FileText, Copy, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { cn, fmtDateTime, fmtRelative } from "@/lib/utils";
import { toast } from "sonner";

export default function PromptRegistry() {
  const [data, setData] = useState<{ workflows: any[]; versions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ prompt: "", change_note: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/prompts");
      if (r.ok) setData(await r.json());
      else toast.error("Failed to load prompts");
    } catch { toast.error("Failed to load prompts"); }
    finally { setLoading(false); }
  }

  async function addVersion(workflowId: string) {
    if (!newForm.prompt.trim()) { toast.error("Prompt required"); return; }
    try {
      const res = await fetch(`/api/prompts/${workflowId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      if (!res.ok) { toast.error("Failed to save prompt version"); return; }
      toast.success("New prompt version saved");
      setShowNew(false);
      setNewForm({ prompt: "", change_note: "" });
      load();
    } catch { toast.error("Failed to save prompt version"); }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  if (!data) return null;

  const byWorkflow: Record<string, any[]> = {};
  for (const v of data.versions) {
    if (!byWorkflow[v.workflow_id]) byWorkflow[v.workflow_id] = [];
    byWorkflow[v.workflow_id].push(v);
  }

  const totalVersions = data.versions.length;
  const workflowsWithHistory = Object.keys(byWorkflow).length;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Prompt Registry</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Versioned prompt history for all workflows</p>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{workflowsWithHistory}</strong> workflows with history</span>
        <span><strong className="text-foreground">{totalVersions}</strong> total versions</span>
      </div>

      {data.workflows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          <FileText size={24} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No workflows yet. Create a workflow to start tracking prompt versions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.workflows.map(wf => {
            const versions = byWorkflow[wf.id] || [];
            const isExpanded = expanded[wf.id];
            const isSelected = selected === wf.id;

            return (
              <div key={wf.id} className="border border-border rounded-lg bg-card overflow-hidden">
                {/* Workflow header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpanded(e => ({ ...e, [wf.id]: !e[wf.id] }))}
                >
                  <FileText size={14} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{wf.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{versions.length} version{versions.length !== 1 ? "s" : ""}</span>
                  </div>
                  {versions.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Latest: v{Math.max(...versions.map((v: any) => v.version))} · {fmtRelative(versions[0]?.created_at)}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setSelected(isSelected ? null : wf.id); setShowNew(!isSelected); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded border border-border hover:border-primary/30"
                  >
                    <Plus size={11} /> Version
                  </button>
                  {isExpanded ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                </div>

                {/* New version form */}
                {isSelected && showNew && (
                  <div className="border-t border-border p-4 bg-secondary/20 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Add New Version for "{wf.name}"</p>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">New Prompt</label>
                      <textarea value={newForm.prompt} onChange={e => setNewForm(f => ({ ...f, prompt: e.target.value }))}
                        className="w-full h-32 px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
                        placeholder="You are a... Your task is to..." />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Change Note</label>
                      <input value={newForm.change_note} onChange={e => setNewForm(f => ({ ...f, change_note: e.target.value }))}
                        className="w-full h-8 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="What changed in this version?" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setSelected(null); setShowNew(false); }} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary text-muted-foreground">Cancel</button>
                      <button onClick={() => addVersion(wf.id)} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Save Version</button>
                    </div>
                  </div>
                )}

                {/* Version list */}
                {isExpanded && versions.length > 0 && (
                  <div className="divide-y divide-border">
                    {versions.map((v: any) => (
                      <div key={v.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-primary">v{v.version}</span>
                            {v.change_note && <span className="text-xs text-muted-foreground">{v.change_note}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-zinc-600">{fmtDateTime(v.created_at)}</span>
                            <button onClick={() => { navigator.clipboard.writeText(v.prompt); toast.success("Copied!"); }}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                              <Copy size={11} /> Copy
                            </button>
                          </div>
                        </div>
                        <pre className="text-[11px] font-mono text-muted-foreground bg-secondary/30 rounded-md p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">{v.prompt}</pre>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && versions.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground border-t border-border">
                    No prompt versions recorded yet.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
