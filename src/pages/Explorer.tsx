import { useEffect, useState } from "react";
import { Database, Table2, Play, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DBEntry {
  name: string;
  path: string;
  description: string;
  metadata: { sizeMB?: string };
}

const DEFAULT_QUERY = "SELECT * FROM sqlite_master WHERE type='table' ORDER BY name";

export default function ExplorerPage() {
  const [databases, setDatabases] = useState<DBEntry[]>([]);
  const [selectedDb, setSelectedDb] = useState<DBEntry | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [rows, setRows] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loadingDbs, setLoadingDbs] = useState(true);
  const [loadingTables, setLoadingTables] = useState(false);
  const [running, setRunning] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => { fetchDatabases(); }, []);

  async function fetchDatabases() {
    setLoadingDbs(true);
    try {
      const res = await fetch("/api/explorer/databases");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DBEntry[] = await res.json();
      setDatabases(data);
    } catch (e: any) {
      toast.error(`Failed to load databases: ${e.message}`);
    } finally {
      setLoadingDbs(false);
    }
  }

  async function selectDatabase(db: DBEntry) {
    setSelectedDb(db);
    setRows(null);
    setColumns([]);
    setQueryError(null);
    setQuery(DEFAULT_QUERY);
    setLoadingTables(true);
    try {
      const res = await fetch("/api/explorer/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbPath: db.path }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTables(data.tables ?? []);
    } catch (e: any) {
      toast.error(`Failed to load tables: ${e.message}`);
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }

  function selectTable(table: string) {
    setQuery(`SELECT * FROM "${table}" LIMIT 100`);
    setRows(null);
    setColumns([]);
    setQueryError(null);
  }

  async function runQuery() {
    if (!selectedDb || !query.trim()) return;
    setRunning(true);
    setQueryError(null);
    setRows(null);
    setColumns([]);
    try {
      const res = await fetch("/api/explorer/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbPath: selectedDb.path, query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      const r: any[] = data.rows ?? [];
      setRows(r);
      setRowCount(data.count ?? r.length);
      setColumns(r.length > 0 ? Object.keys(r[0]) : []);
    } catch (e: any) {
      setQueryError(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — DB + table list */}
      <aside className="w-56 shrink-0 border-r border-border flex flex-col" style={{ background: "var(--sidebar)" }}>
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Databases</span>
          <button onClick={fetchDatabases} disabled={loadingDbs} className="text-muted-foreground hover:text-foreground disabled:opacity-40">
            <RefreshCw size={11} className={cn(loadingDbs && "animate-spin")} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loadingDbs ? (
            <div className="px-3 py-4 text-xs text-muted-foreground animate-pulse">Loading…</div>
          ) : databases.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">
              No SQLite databases found. Run a discovery scan first.
            </div>
          ) : (
            databases.map(db => (
              <div key={db.path}>
                <button
                  onClick={() => selectDatabase(db)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5",
                    selectedDb?.path === db.path ? "bg-primary/15 text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Database size={12} className={cn("shrink-0", selectedDb?.path === db.path ? "text-primary" : "")} />
                  <span className="truncate font-medium">{db.name}</span>
                  {db.metadata?.sizeMB && (
                    <span className="ml-auto text-[10px] text-zinc-600 shrink-0">{db.metadata.sizeMB}MB</span>
                  )}
                </button>

                {selectedDb?.path === db.path && (
                  <div className="ml-5 border-l border-border/50 pl-2 py-0.5">
                    {loadingTables ? (
                      <div className="px-2 py-1 text-[10px] text-muted-foreground animate-pulse">Loading tables…</div>
                    ) : tables.length === 0 ? (
                      <div className="px-2 py-1 text-[10px] text-muted-foreground">No tables</div>
                    ) : (
                      tables.map(t => (
                        <button
                          key={t}
                          onClick={() => selectTable(t)}
                          className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/5 rounded transition-colors"
                        >
                          <Table2 size={10} className="shrink-0" />
                          <span className="truncate">{t}</span>
                          <ChevronRight size={9} className="ml-auto shrink-0 opacity-40" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Right panel — query + results */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Query bar */}
        <div className="border-b border-border px-4 py-3 space-y-2 shrink-0" style={{ background: "var(--card)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Query</span>
            {selectedDb && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{selectedDb.name}</span>
            )}
            <span className="text-[10px] text-zinc-600 ml-auto">SELECT / PRAGMA only</span>
          </div>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={!selectedDb}
            rows={3}
            className="w-full px-3 py-2 text-xs font-mono bg-secondary border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none disabled:opacity-50"
            placeholder="SELECT * FROM table_name LIMIT 50"
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runQuery(); }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">⌘↵ to run</span>
            <button
              onClick={runQuery}
              disabled={!selectedDb || running || !query.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors font-medium"
            >
              {running ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
              {running ? "Running…" : "Run"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {queryError && (
            <div className="m-4 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <pre className="whitespace-pre-wrap font-mono text-xs">{queryError}</pre>
            </div>
          )}

          {!selectedDb && !queryError && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-3">
              <Database size={36} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select a database from the left panel to begin.</p>
            </div>
          )}

          {rows !== null && rows.length === 0 && !queryError && (
            <div className="p-6 text-sm text-muted-foreground">Query returned 0 rows.</div>
          )}

          {rows !== null && rows.length > 0 && (
            <div className="overflow-auto">
              <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border bg-card sticky top-0">
                {rowCount} row{rowCount !== 1 ? "s" : ""} · {columns.length} column{columns.length !== 1 ? "s" : ""}
                {rowCount === 500 && <span className="ml-2 text-yellow-400">(results capped at 500)</span>}
              </div>
              <table className="min-w-full text-xs">
                <thead className="sticky top-8">
                  <tr className="border-b border-border" style={{ background: "var(--card)" }}>
                    {columns.map(col => (
                      <th key={col} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      {columns.map(col => (
                        <td key={col} className="px-3 py-1.5 text-muted-foreground font-mono max-w-xs">
                          <span className="block truncate" title={String(row[col] ?? "")}>
                            {row[col] === null ? <span className="text-zinc-600 italic">null</span> : String(row[col])}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
