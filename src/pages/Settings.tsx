import { useEffect, useState } from "react";
import { Settings, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type SettingsMap = Record<string, string>;

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 w-64">{children}</div>
    </div>
  );
}

function SettingInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
  );
}

function SettingSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-secondary border border-border"}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/settings");
      if (r.ok) setSettings(await r.json());
      else toast.error("Failed to load settings");
    } catch { toast.error("Failed to load settings"); }
    finally { setLoading(false); }
  }

  function update(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) { toast.error("Failed to save settings"); return; }
      toast.success("Settings saved");
      setDirty(false);
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  }

  const s = settings;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ZoOps configuration and preferences</p>
        </div>
        <button onClick={save} disabled={!dirty || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-opacity">
          <Save size={13} /> {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <div className="space-y-8">
          {/* General */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">General</h2>
            <div className="bg-card border border-border rounded-lg px-4">
              <SettingRow label="App Name" description="Display name for this ZoOps instance">
                <SettingInput value={s.appName || "ZoOps"} onChange={v => update("appName", v)} placeholder="ZoOps" />
              </SettingRow>
              <SettingRow label="Default Model" description="Model used for AI suggestions when enabled">
                <SettingInput value={s.defaultModel || "claude-sonnet-4-6"} onChange={v => update("defaultModel", v)} placeholder="claude-sonnet-4-6" />
              </SettingRow>
              <SettingRow label="Default Persona" description="Persona applied to AI-assisted runs">
                <SettingInput value={s.defaultPersona || ""} onChange={v => update("defaultPersona", v)} placeholder="Leave blank for default" />
              </SettingRow>
            </div>
          </section>

          {/* Thresholds */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Thresholds</h2>
            <div className="bg-card border border-border rounded-lg px-4">
              <SettingRow label="Disk Warning %" description="Disk usage percentage that triggers a health warning">
                <SettingInput value={s.diskWarningPercent || "70"} onChange={v => update("diskWarningPercent", v)} type="number" />
              </SettingRow>
              <SettingRow label="Memory Warning %" description="Memory usage percentage that triggers a health warning">
                <SettingInput value={s.memWarningPercent || "80"} onChange={v => update("memWarningPercent", v)} type="number" />
              </SettingRow>
              <SettingRow label="Failed Runs Warning" description="Number of failed runs in 24h before health warning">
                <SettingInput value={s.failedRunsWarningCount || "3"} onChange={v => update("failedRunsWarningCount", v)} type="number" />
              </SettingRow>
            </div>
          </section>

          {/* AI */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">AI Calls</h2>
            <div className="bg-card border border-border rounded-lg px-4">
              <SettingRow label="AI Calls Enabled" description="Allow ZoOps to make AI calls for suggestions and summaries. Disabled by default — all operations work without AI.">
                <div className="flex items-center gap-3">
                  <Toggle checked={s.aiCallsEnabled === "true"} onChange={v => update("aiCallsEnabled", String(v))} />
                  <span className="text-sm text-muted-foreground">{s.aiCallsEnabled === "true" ? "Enabled" : "Disabled"}</span>
                </div>
              </SettingRow>
            </div>
            {s.aiCallsEnabled !== "true" && (
              <p className="text-xs text-muted-foreground mt-2 px-1">
                ℹ All ZoOps features work without AI calls. Enable only if you want AI-powered summaries or suggestions.
              </p>
            )}
          </section>

          {/* Discovery */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Discovery</h2>
            <div className="bg-card border border-border rounded-lg px-4">
              <SettingRow label="Scan Paths" description="Comma-separated paths to scan during discovery">
                <SettingInput value={s.scanPaths || "/home/workspace"} onChange={v => update("scanPaths", v)} placeholder="/home/workspace" />
              </SettingRow>
            </div>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Security</h2>
            <div className="bg-card border border-border rounded-lg px-4">
              <SettingRow label="Secret Masking" description="Patterns matched in environment configs are masked automatically">
                <div className="h-9 px-3 flex items-center text-xs text-muted-foreground bg-secondary/50 rounded-md border border-border font-mono">
                  key, token, secret, password, auth
                </div>
              </SettingRow>
              <SettingRow label="Destructive Commands" description="ZoOps never runs destructive commands on your system">
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Disabled — read-only only
                </div>
              </SettingRow>
            </div>
          </section>

          {/* External Reporting (stub) */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              External Reporting <span className="text-[10px] text-muted-foreground font-normal normal-case tracking-normal ml-1">(optional, future)</span>
            </h2>
            <div className="bg-card border border-border rounded-lg px-4">
              <SettingRow label="External Reporting" description="Send health reports to an external ZoOps control plane (future capability)">
                <div className="flex items-center gap-3">
                  <Toggle checked={s.externalReportingEnabled === "true"} onChange={v => update("externalReportingEnabled", String(v))} />
                  <span className="text-sm text-muted-foreground">{s.externalReportingEnabled === "true" ? "Enabled" : "Disabled"}</span>
                </div>
              </SettingRow>
              {s.externalReportingEnabled === "true" && (
                <>
                  <SettingRow label="Reporting Endpoint" description="URL to POST health reports to">
                    <SettingInput value={s.externalReportingEndpoint || ""} onChange={v => update("externalReportingEndpoint", v)} placeholder="https://your-control-plane.com/api/reports" />
                  </SettingRow>
                  <SettingRow label="Reporting Token" description="Bearer token for the reporting endpoint">
                    <SettingInput value={s.externalReportingToken || ""} onChange={v => update("externalReportingToken", v)} placeholder="sk-..." type="password" />
                  </SettingRow>
                  <SettingRow label="Test Report" description="Send a test health report to verify the connection">
                    <button onClick={() => toast.info("External reporting stub — not yet implemented")}
                      className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary text-muted-foreground">
                      Send Test Report
                    </button>
                  </SettingRow>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              External reporting is designed for a future Cloudflare-based ZoOps control plane. Not required for local use.
            </p>
          </section>

          {/* About */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">About</h2>
            <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-xs text-muted-foreground">
              <p><strong className="text-foreground">ZoOps</strong> — Zo-native management plane for your Zo Computer</p>
              <p>Runs locally · No external SaaS · No telemetry · SQLite storage</p>
              <p>AI calls are opt-in and off by default. All features work without AI.</p>
              <a href="/?t=sites" className="flex items-center gap-1 text-primary hover:underline mt-1">
                <ExternalLink size={11} /> View in Zo Hosting
              </a>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
