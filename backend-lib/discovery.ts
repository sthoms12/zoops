import { execSync } from "child_process";
import { existsSync, readdirSync, statSync, readFileSync } from "fs";
import { join, dirname, basename } from "path";
import { db, generateId, now } from "./db";
import { getWorkspaceRoots } from "./settings";

const SECRET_PATTERNS = /key|token|secret|password|pass|pwd|auth|bearer|credential/i;

export interface DiscoveredItem {
  id: string;
  type: string;
  name: string;
  path: string;
  description: string;
  metadata: Record<string, unknown>;
  discovered_at: string;
  last_seen_at: string;
}

function safeStat(p: string) {
  try { return statSync(p); } catch { return null; }
}

function safeRead(p: string, maxBytes = 2000): string {
  try {
    const buf = readFileSync(p);
    return buf.slice(0, maxBytes).toString("utf-8");
  } catch { return ""; }
}

function findFiles(dir: string, name: string, maxDepth = 3, depth = 0): string[] {
  if (depth > maxDepth) return [];
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name === "Trash") continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        results.push(...findFiles(full, name, maxDepth, depth + 1));
      } else if (e.name === name) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

function findByExtension(dir: string, exts: string[], maxDepth = 3, depth = 0): string[] {
  if (depth > maxDepth) return [];
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name === "Trash") continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        results.push(...findByExtension(full, exts, maxDepth, depth + 1));
      } else if (exts.some(ext => e.name.endsWith(ext))) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

function maskSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_PATTERNS.test(k)) {
      out[k] = "***MASKED***";
    } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      out[k] = maskSecrets(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function runCommand(commands: string[], timeout = 3000): string {
  for (const command of commands) {
    try {
      const output = execSync(command, { timeout, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
      if (output) return output;
    } catch {}
  }
  return "";
}

export function runDiscovery(): DiscoveredItem[] {
  const items: DiscoveredItem[] = [];
  const seenPaths = new Set<string>();
  const workspaceRoots = getWorkspaceRoots();

  function addItem(type: string, name: string, path: string, description: string, metadata: Record<string, unknown> = {}) {
    if (seenPaths.has(path)) return;
    seenPaths.add(path);
    items.push({
      id: generateId(),
      type,
      name,
      path,
      description,
      metadata: maskSecrets(metadata),
      discovered_at: now(),
      last_seen_at: now(),
    });
  }

  // Discover Zo Sites (zosite.json)
  const zosites = workspaceRoots.flatMap(root => findFiles(root, "zosite.json"));
  for (const p of zosites) {
    try {
      const cfg = JSON.parse(safeRead(p, 64 * 1024));
      const dir = dirname(p);
      const name = cfg.name || basename(dir);
      addItem("zo-site", name, dir, `Zo Site: port ${cfg.local_port || "?"}`, {
        port: cfg.local_port,
        label: cfg.publish?.label,
        publishPort: cfg.publish?.published_port,
      });
    } catch {}
  }

  // Discover Node/Bun projects (package.json)
  const pkgFiles = workspaceRoots.flatMap(root => findFiles(root, "package.json"));
  for (const p of pkgFiles) {
    const dir = dirname(p);
    try {
      const pkg = JSON.parse(safeRead(p, 64 * 1024));
      const hasSite = zosites.some(z => dirname(z) === dir);
      if (!hasSite) {
        addItem("node-project", pkg.name || basename(dir), dir, pkg.description || "Node/Bun project", {
          version: pkg.version,
          scripts: Object.keys(pkg.scripts || {}),
        });
      }
    } catch {}
  }

  // Discover Python projects
  const reqFiles = workspaceRoots.flatMap(root => findFiles(root, "requirements.txt"));
  for (const p of reqFiles) {
    const dir = dirname(p);
    const content = safeRead(p, 500);
    addItem("python-project", basename(dir), dir, "Python project", {
      packages: content.split("\n").filter(Boolean).slice(0, 10),
    });
  }

  // Discover SQLite databases
  const dbFiles = workspaceRoots.flatMap(root => findByExtension(root, [".db", ".sqlite", ".sqlite3"], 4));
  for (const p of dbFiles) {
    const s = safeStat(p);
    const sizeMB = s ? (s.size / 1024 / 1024).toFixed(2) : "?";
    addItem("database", basename(p), p, `SQLite database (${sizeMB} MB)`, {
      sizeMB,
    });
  }

  // Discover Skills
  const skillFiles = workspaceRoots.flatMap(root => findFiles(join(root, "Skills"), "SKILL.md", 2));
  for (const p of skillFiles) {
    const content = safeRead(p, 1000);
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    const name = nameMatch?.[1]?.trim() || basename(dirname(p));
    const desc = descMatch?.[1]?.trim() || "";
    addItem("skill", name, dirname(p), desc || `Skill: ${name}`, { skillPath: p });
  }

  // Discover README files (project docs)
  const readmes = workspaceRoots.flatMap(root => findFiles(root, "README.md", 2));
  for (const p of readmes) {
    const dir = dirname(p);
    // Skip if already discovered as another type
    if ([...seenPaths].some(sp => sp === dir)) continue;
    const content = safeRead(p, 300);
    const firstLine = content.split("\n").find(l => l.trim()) || basename(dir);
    const name = firstLine.replace(/^#+\s*/, "").trim().slice(0, 60);
    addItem("project", name, dir, `Project with README`, { readmePath: p });
  }

  // Discover env/config files (mask values)
  const envFiles = workspaceRoots.flatMap(root => findByExtension(root, [".env", ".env.local", ".env.example"], 3));
  for (const p of envFiles) {
    if (p.includes("node_modules")) continue;
    const content = safeRead(p, 2000);
    const keys = content.split("\n")
      .filter(l => l.includes("=") && !l.startsWith("#"))
      .map(l => l.split("=")[0].trim())
      .filter(Boolean);
    addItem("env-config", basename(p), p, `Environment config (${keys.length} vars)`, {
      keys,
      note: "Values masked for security",
    });
  }

  // Discover recently modified files (last 24h)
  try {
    const quotedRoots = workspaceRoots.map(root => `"${root}"`).join(" ");
    const output = execSync(
      `find ${quotedRoots} -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/Trash/*" -not -path "*/dist/*" -newer /tmp/.zoops_lastcheck -type f 2>/dev/null | head -20`,
      { timeout: 5000 }
    ).toString().trim();
    execSync("touch /tmp/.zoops_lastcheck", { timeout: 1000 });
    const recentFiles = output.split("\n").filter(Boolean);
    if (recentFiles.length > 0) {
      addItem("recent-changes", `${recentFiles.length} recently modified files`, workspaceRoots[0], "Files changed recently", {
        files: recentFiles.map(f => {
          const root = workspaceRoots.find(candidate => f.startsWith(candidate + "/"));
          return root ? f.replace(root + "/", "") : f;
        }),
      });
    }
  } catch {}

  // Discover running ports/listeners (safe read)
  try {
    const output = runCommand([
      "ss -tln 2>/dev/null | awk 'NR>1 {print $4}' | head -20",
      "netstat -tln 2>/dev/null | awk 'NR>2 {print $4}' | head -20",
      "lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $9}' | head -20",
    ]);
    const ports = [...new Set(output.split("\n").filter(Boolean).map(l => {
      const m = l.match(/:(\d+)$/);
      return m ? parseInt(m[1]) : null;
    }).filter(Boolean))];
    if (ports.length > 0) {
      addItem("network", "Active listeners", "network", `${ports.length} ports listening`, {
        ports,
      });
    }
  } catch {}

  // Discover service log files
  try {
    const logFiles = readdirSync("/dev/shm").filter(f => f.endsWith(".log") && !f.endsWith("_err.log"));
    const services = logFiles.map(f => f.replace(".log", ""));
    if (services.length > 0) {
      addItem("zo-services", `${services.length} Zo services detected`, "/dev/shm", "Services with active log files", {
        services,
      });
    }
  } catch {}

  return items;
}

export function persistDiscovery(items: DiscoveredItem[]) {
  const upsert = db.prepare(`
    INSERT INTO discovered_items (id, type, name, path, description, metadata, discovered_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET last_seen_at=excluded.last_seen_at
  `);

  // Clear old and re-insert
  db.run("DELETE FROM discovered_items");
  for (const item of items) {
    upsert.run(item.id, item.type, item.name, item.path, item.description,
      JSON.stringify(item.metadata), item.discovered_at, item.last_seen_at);
  }
}

export function syncZoSitesToServices(): { added: string[]; total: number } {
  const zosites = getWorkspaceRoots().flatMap(root => findFiles(root, "zosite.json"));
  const upsert = db.prepare(`
    INSERT INTO services (id, name, type, status, endpoint, port, notes, last_checked_at, updated_at)
    VALUES (?, ?, 'zo-site', 'detected', NULL, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      port=excluded.port,
      notes=excluded.notes,
      last_checked_at=excluded.last_checked_at,
      updated_at=excluded.updated_at
  `);
  const added: string[] = [];
  for (const p of zosites) {
    try {
      const cfg = JSON.parse(safeRead(p, 64 * 1024));
      const name: string = cfg.name || basename(dirname(p));
      const id = name.replace(/[^a-zA-Z0-9]/g, "_");
      const port: number | null = cfg.local_port || cfg.publish?.published_port || null;
      const publishLabel = cfg.publish?.label ? ` · label ${cfg.publish.label}` : "";
      const notes = `Zo Site in ${dirname(p)}${publishLabel}`;
      const existing = db.prepare("SELECT id FROM services WHERE id=?").get(id);
      const result = upsert.run(id, name, port, notes);
      if (!existing && result.changes > 0) added.push(name);
    } catch {}
  }
  const total = (db.prepare("SELECT COUNT(*) as c FROM services WHERE type='zo-site'").get() as { c: number })?.c ?? 0;
  return { added, total };
}

export function detectServicesFromLogs(): Array<{ name: string; logPath: string; errPath: string | null }> {
  const services: Array<{ name: string; logPath: string; errPath: string | null }> = [];
  try {
    const files = readdirSync("/dev/shm");
    const logFiles = files.filter(f => f.endsWith(".log") && !f.endsWith("_err.log") && !f.endsWith("-proxy.log") && !f.endsWith("-browser.log"));
    for (const f of logFiles) {
      const name = f.replace(".log", "");
      const errPath = files.includes(`${name}_err.log`) ? `/dev/shm/${name}_err.log` : null;
      services.push({ name, logPath: `/dev/shm/${f}`, errPath });
    }
  } catch {}
  return services;
}
