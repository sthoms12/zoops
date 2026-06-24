import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Automation {
  id: string;
  title: string;
  schedule_summary: string | null;
  next_run: string | null;
  active: number;
}

interface RunRecord {
  workflow_name: string;
  status: string;
  id: string;
}

interface CalendarData {
  automations: Automation[];
  runsByDate: Record<string, RunRecord[]>;
}

const STATUS_DOT: Record<string, string> = {
  completed: "bg-emerald-400",
  failed: "bg-red-500",
  needs_review: "bg-orange-400",
  pending: "bg-zinc-500",
};

function statusDotColor(status: string) {
  return STATUS_DOT[status] ?? "bg-zinc-500";
}

function DayCard({ date, label, isPast, isToday, runs, scheduled }: {
  date: string;
  label: string;
  isPast: boolean;
  isToday: boolean;
  runs: RunRecord[];           // actual past runs
  scheduled: Automation[];     // automations scheduled for this future day
}) {
  const hasActivity = isPast ? runs.length > 0 : scheduled.length > 0;
  const failedRuns = runs.filter(r => r.status === "failed" || r.status === "needs_review");
  const allGood = isPast && runs.length > 0 && failedRuns.length === 0;
  const hasFailed = failedRuns.length > 0;

  return (
    <div className={cn(
      "rounded-lg border bg-card overflow-hidden",
      isToday ? "border-primary/40" : "border-border",
      !hasActivity && isPast ? "opacity-50" : ""
    )}>
      {/* Day header */}
      <div className={cn(
        "px-4 py-2.5 border-b flex items-center justify-between",
        isToday ? "bg-primary/8 border-primary/20" : "bg-secondary/30 border-border"
      )}>
        <h3 className={cn("text-sm font-medium", isToday ? "text-primary" : "text-foreground")}>
          {label}
        </h3>
        {isPast && runs.length > 0 && (
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded",
            allGood ? "bg-emerald-500/15 text-emerald-400" : hasFailed ? "bg-red-500/15 text-red-400" : "bg-zinc-500/15 text-zinc-400"
          )}>
            {allGood ? `${runs.length} ran ✓` : hasFailed ? `${failedRuns.length} failed` : `${runs.length} ran`}
          </span>
        )}
      </div>

      <div className="px-4 py-3">
        {isPast ? (
          runs.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">No automations ran</p>
          ) : (
            <div className="space-y-1.5">
              {runs.map((r, i) => (
                <Link
                  key={`${r.id}-${i}`}
                  to={`/runs/${r.id}`}
                  className="flex items-center gap-2 group"
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", statusDotColor(r.status))} />
                  <span className="text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors flex-1">
                    {r.workflow_name}
                  </span>
                  <ChevronRight size={10} className="text-zinc-700 group-hover:text-muted-foreground transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )
        ) : (
          scheduled.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">Nothing scheduled</p>
          ) : (
            <div className="space-y-1.5">
              {scheduled.map(a => {
                const time = a.next_run
                  ? new Date(a.next_run).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                  : null;
                return (
                  <Link key={a.id} to={`/automations/${a.id}`} className="flex items-center gap-2 group">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-blue-400/60" />
                    <span className="text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors flex-1">
                      {a.title}
                    </span>
                    {time && (
                      <span className="text-[10px] text-zinc-600 shrink-0 flex items-center gap-0.5">
                        <Clock size={9} /> {time}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function AutomationCalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/automations/calendar");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      toast.error(`Failed to load calendar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Build day list: past 14 days (reversed so today is first) + next 13 days
  function buildDays() {
    if (!data) return [];
    const days: { date: string; label: string; isPast: boolean; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = i === 0
        ? `Today — ${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`
        : d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      days.push({ date: dateStr, label, isPast: true, isToday: i === 0 });
    }

    for (let i = 1; i <= 13; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      days.push({ date: dateStr, label, isPast: false, isToday: false });
    }

    return days;
  }

  const days = buildDays();

  // For future days: find automations whose next_run falls on that date
  function scheduledFor(dateStr: string): Automation[] {
    if (!data) return [];
    return data.automations.filter(a => {
      if (!a.next_run || !a.active) return false;
      return new Date(a.next_run).toISOString().split("T")[0] === dateStr;
    });
  }

  const pastDays = days.filter(d => d.isPast);
  const futureDays = days.filter(d => !d.isPast);

  const totalPastRuns = data
    ? Object.values(data.runsByDate).reduce((sum, runs) => sum + runs.length, 0)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Calendar size={18} /> Automation Schedule
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {loading
            ? "Loading…"
            : `${data?.automations.length ?? 0} automations · ${totalPastRuns} runs in the last 14 days`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : !data ? null : (
        <div className="space-y-6">
          {/* Past 14 days */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Past 14 Days — Actual Runs
            </h2>
            <div className="space-y-2">
              {pastDays.map(day => (
                <DayCard
                  key={day.date}
                  date={day.date}
                  label={day.label}
                  isPast={true}
                  isToday={day.isToday}
                  runs={data.runsByDate[day.date] ?? []}
                  scheduled={[]}
                />
              ))}
            </div>
          </div>

          {/* Next 13 days */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Upcoming — Scheduled Runs
            </h2>
            <div className="space-y-2">
              {futureDays.map(day => (
                <DayCard
                  key={day.date}
                  date={day.date}
                  label={day.label}
                  isPast={false}
                  isToday={false}
                  runs={[]}
                  scheduled={scheduledFor(day.date)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
