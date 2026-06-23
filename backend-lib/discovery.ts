import { execSync } from "child_process";
import { existsSync, readdirSync, statSync, readFileSync } from "fs";
import { join, dirname, basename } from "path";
import { db, generateId, now } from "./db";

const WORKSPACE = "/home/workspace";
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

export function runDiscovery(): DiscoveredItem[] {
  const items: DiscoveredItem[] = [];
  const seenPaths = new Set<string>();

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
  const zosites = findFiles(WORKSPACE, "zosite.json");
  for (const p of zosites) {
    try {
      const cfg = JSON.parse(safeRead(p));
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
  const pkgFiles = findFiles(WORKSPACE, "package.json");
  for (const p of pkgFiles) {
    const dir = dirname(p);
    try {
      const pkg = JSON.parse(safeRead(p));
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
  const reqFiles = findFiles(WORKSPACE, "requirements.txt");
  for (const p of reqFiles) {
    const dir = dirname(p);
    const content = safeRead(p, 500);
    addItem("python-project", basename(dir), dir, "Python project", {
      packages: content.split("\n").filter(Boolean).slice(0, 10),
    });
  }

  // Discover SQLite databases
  const dbFiles = findByExtension(WORKSPACE, [".db", ".sqlite", ".sqlite3"], 4);
  for (const p of dbFiles) {
    const s = safeStat(p);
    const sizeMB = s ? (s.size / 1024 / 1024).toFixed(2) : "?";
    addItem("database", basename(p), p, `SQLite database (${sizeMB} MB)`, {
      sizeMB,
    });
  }

  // Discover Skills
  const skillFiles = findFiles(join(WORKSPACE, "Skills"), "SKILL.md", 2);
  for (const p of skillFiles) {
    const content = safeRead(p, 1000);
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    const name = nameMatch?.[1]?.trim() || basename(dirname(p));
    const desc = descMatch?.[1]?.trim() || "";
    addItem("skill", name, dirname(p), desc || `Skill: ${name}`, { skillPath: p });
  }

  // Discover README files (project docs)
  const readmes = findFiles(WORKSPACE, "README.md", 2);
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
  const envFiles = findByExtension(WORKSPACE, [".env", ".env.local", ".env.example"], 3);
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
    const output = execSync(
      `find ${WORKSPACE} -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/Trash/*" -not -path "*/dist/*" -newer /tmp/.zoops_lastcheck -type f 2>/dev/null | head -20`,
      { timeout: 5000 }
    ).toString().trim();
    execSync("touch /tmp/.zoops_lastcheck", { timeout: 1000 });
    const recentFiles = output.split("\n").filter(Boolean);
    if (recentFiles.length > 0) {
      addItem("recent-changes", `${recentFiles.length} recently modified files`, WORKSPACE, "Files changed recently", {
        files: recentFiles.map(f => f.replace(WORKSPACE + "/", "")),
      });
    }
  } catch {}

  // Discover running ports/listeners (safe read)
  try {
    const output = execSync("ss -tlnp 2>/dev/null | grep LISTEN | awk '{print $4}' | head -20", {
      timeout: 3000,
    }).toString().trim();
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
