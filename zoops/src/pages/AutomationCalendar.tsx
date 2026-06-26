import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Automation {
  id: string;
  title: string;
  schedule_summary: string | null;
  next_run: string | null;
  active: number;
}

interface CalendarData {
  automations: Automation[];
}

function DayCard({ label, isToday, scheduled }: {
  label: string;
  isToday: boolean;
  scheduled: Automation[];
}) {
  return (
    <div className={cn(
      "rounded-lg border bg-card overflow-hidden",
      isToday ? "border-primary/40" : "border-border",
      scheduled.length === 0 ? "opacity-50" : ""
    )}>
      <div className={cn(
        "px-4 py-2.5 border-b flex items-center justify-between",
        isToday ? "bg-primary/8 border-primary/20" : "bg-secondary/30 border-border"
      )}>
        <h3 className={cn("text-sm font-medium", isToday ? "text-primary" : "text-foreground")}>
          {label}
        </h3>
      </div>
      <div className="px-4 py-3">
        {scheduled.length === 0 ? (
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

  // Build next 14 days starting today
  function buildDays() {
    if (!data) return [];
    const days: { date: string; label: string; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i <= 13; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const label = i === 0
        ? `Today — ${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`
        : d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      days.push({ date: dateStr, label, isToday: i === 0 });
    }
    return days;
  }

  const days = buildDays();

  function scheduledFor(dateStr: string): Automation[] {
    if (!data) return [];
    return data.automations.filter(a => {
      if (!a.next_run || !a.active) return false;
      return new Date(a.next_run).toISOString().split("T")[0] === dateStr;
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Calendar size={18} /> Automation Schedule
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {loading ? "Loading…" : `${data?.automations.length ?? 0} automations — next 14 days`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : !data ? null : (
        <div className="space-y-2">
          {days.map(day => (
            <DayCard
              key={day.date}
              label={day.label}
              isToday={day.isToday}
              scheduled={scheduledFor(day.date)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
