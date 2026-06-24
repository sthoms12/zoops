import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// SQLite datetime('now') returns "2026-06-23 17:35:00" (no T, no Z).
// Normalize to ISO 8601 UTC so Date.parse works consistently across browsers.
function normalizeDate(iso: string): Date {
  const normalized = /^\d{4}-\d{2}-\d{2} /.test(iso) ? iso.replace(" ", "T") + "Z" : iso;
  return new Date(normalized);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = normalizeDate(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = normalizeDate(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const diff = Date.now() - normalizeDate(iso).getTime();
  if (diff < 0) {
    const abs = -diff;
    const mins = Math.floor(abs / 60000);
    const hours = Math.floor(abs / 3600000);
    const days = Math.floor(abs / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `in ${mins}m`;
    if (hours < 24) return `in ${hours}h`;
    if (days < 30) return `in ${days}d`;
    return fmtDate(iso);
  }
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function fmtUptime(seconds: number | null): string {
  if (seconds === null) return "Unknown";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

export const STATUS_COLORS: Record<string, string> = {
  // Health states
  healthy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  warning: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  failed: "text-red-400 bg-red-400/10 border-red-400/20",
  stale: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  needs_review: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  // Run statuses
  completed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  pending: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  in_progress: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  // Workflow statuses
  active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  paused: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  archived: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  draft: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  failing: "text-red-400 bg-red-400/10 border-red-400/20",
  // Browser session
  working: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  unknown: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  login_expired: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  needs_2fa: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  blocked: "text-red-400 bg-red-400/10 border-red-400/20",
  layout_drift: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  detected: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  // Priority
  high: "text-red-400 bg-red-400/10 border-red-400/20",
  normal: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  low: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
};

export function statusLabel(s: string): string {
  const labels: Record<string, string> = {
    needs_review: "Needs Review", in_progress: "In Progress",
    login_expired: "Login Expired", needs_2fa: "2FA Needed",
    layout_drift: "Layout Drift",
  };
  return labels[s] || s.charAt(0).toUpperCase() + s.slice(1);
}
