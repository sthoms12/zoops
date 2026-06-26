import config from "../zosite.json";
import { db } from "./db";

export function getSetting(key: string, fallback = ""): string {
  const row = db.prepare("SELECT value FROM settings WHERE key=?").get(key) as { value?: string } | null;
  return row?.value ?? fallback;
}

export function getSettingNumber(key: string, fallback: number): number {
  const value = Number(getSetting(key, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

export function getWorkspaceRoots(): string[] {
  const raw = getSetting("scanPaths", "/home/workspace");
  const roots = raw
    .split(",")
    .map(part => part.trim())
    .filter(Boolean)
    .filter(path => path.startsWith("/"));
  return roots.length > 0 ? [...new Set(roots)] : ["/home/workspace"];
}

export function getRuntimePort(): number {
  const fromEnv = Number(process.env.PORT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return Number(config.local_port) || 50165;
}
