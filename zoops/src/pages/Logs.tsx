import { useEffect, useState, useRef, useCallback } from "react";
import { RefreshCw, Terminal, Play, Pause, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LogFile {
  name: string;
  file: string;
}

type Severity = "error" | "warn" | "info" | "debug" | "default";

function classifyLine(line: string): Severity {
  const u = line.toUpperCase();
  if (u.includes("ERROR") || u.includes("EXCEPTION") || u.includes("FATAL") || u.includes("ERR]")) return "error";
  if (u.includes("WARN") || u.includes("WARNING")) return "warn";
  if (u.includes("INFO") || u.includes("[INFO]")) return "info";
  if (u.includes("DEBUG") || u.includes("[DEBUG]")) return "debug";
  return "default";
}

const SEVERITY_CLASS: Record<Severity, string> = {
  error: "text-red-400",
  warn: "text-yellow-400",
  info: "text-blue-400",
  debug: "text-zinc-500",
  default: "text-muted-foreground",
};

const LINE_COUNTS = [100, 200, 500, 1000];

export default function LogsPage() {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [lines, setLines] = useState<string[]>([]);
  const [lineCount, setLineCount] = useState(200);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [total, setTotal] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (selected) fetchLog();
  }, [selected, lineCount]);

  useEffect(() => {
    if (live && selected) {
      intervalRef.current = setInterval(fetchLog, 2500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [live, selected, lineCount]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, autoScroll]);

  async function fetchList() {
    try {
      const res = await fetch("/api/logs/list");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LogFile[] = await res.json();
      setLogFiles(data);
      if (data.length > 0 && !selected) setSelected(data[0].name);
    } catch (e: any) {
      toast.error(`Failed to list logs: ${e.message}`);
    }
  }

  const fetchLog = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/logs/${encodeURIComponent(selected)}?lines=${lineCount}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLines(data.lines ?? []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      if (!live) toast.error(`Failed to load log: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [selected, lineCount, live]);

  const visibleLines = filter.trim()
    ? lines.filter(l => l.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
        <Terminal size={15} className="text-primary shrink-0" />
        <span className="text-sm font-semibold mr-1">Log Viewer</span>

        <select
          value={selected}
          onChange={e => { setSelected(e.target.value); setLive(false); }}
          className="px-2 py-1 text-xs bg-secondary border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground max-w-[200px]"
        >
          {logFiles.length === 0 && <option value="">No log files found</option>}
          {logFiles.map(f => <option key={f.name} value={f.name}>{f.name}.log</option>)}
        </select>

        <select
          value={lineCount}
          onChange={e => setLineCount(parseInt(e.target.value))}
          className="px-2 py-1 text-xs bg-secondary border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground w-24"
        >
          {LINE_COUNTS.map(n => <option key={n} value={n}>Last {n}</option>)}
        </select>

        <div className="relative flex-1 min-w-[120px] max-w-xs">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter lines…"
            className="w-full px-2 py-1 text-xs bg-secondary border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground pr-6"
          />
          {filter && (
            <button onClick={() => setFilter("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={10} />
            </button>
          )}
        </div>

        <button
          onClick={() => setLive(l => !l)}
          disabled={!selected}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors disabled:opacity-40",
            live
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "border-border hover:bg-muted text-muted-foreground"
          )}
        >
          {live ? <><Pause size={10} /> Live</> : <><Play size={10} /> Live</>}
        </button>

        <button
          onClick={fetchLog}
          disabled={loading || !selected}
          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 transition-colors text-muted-foreground"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
        </button>

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto cursor-pointer">
          <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="w-3 h-3" />
          Auto-scroll
        </label>

        <span className="text-xs text-zinc-600">
          {filter ? `${visibleLines.length} / ${lines.length} lines` : `${lines.length} / ${total} lines`}
        </span>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed" style={{ background: "var(--background)" }}>
        {!selected ? (
          <p className="text-muted-foreground p-4">Select a log file above.</p>
        ) : loading && lines.length === 0 ? (
          <p className="text-muted-foreground p-4 animate-pulse">Loading…</p>
        ) : visibleLines.length === 0 ? (
          <p className="text-muted-foreground p-4">
            {filter ? "No lines match your filter." : "Log file is empty."}
          </p>
        ) : (
          visibleLines.map((line, i) => {
            const sev = classifyLine(line);
            return (
              <div key={i} className={cn("hover:bg-white/5 px-1 rounded whitespace-pre-wrap break-all", SEVERITY_CLASS[sev])}>
                {line}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
