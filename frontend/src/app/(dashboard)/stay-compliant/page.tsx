"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ChevronLeft, ChevronRight, BellRing, Loader2, AlertTriangle } from "lucide-react";
import { api, ApiError, type ComplianceEvent } from "@/lib/api";

type DayEvent = { color: string; label: string };
type CalDay = { day: number; muted: boolean; today?: boolean; date?: Date; event?: DayEvent };

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const TYPE_COLOR: Record<ComplianceEvent["type"], string> = {
  license_renewal: "#D97706",
  contract_expiry: "#D97706",
  tax_deadline: "#2A6FDB",
  hr_obligation: "#1F8A5B",
};

const TYPE_LABEL: Record<ComplianceEvent["type"], string> = {
  license_renewal: "License Renewal",
  contract_expiry: "Contract Expiry",
  tax_deadline: "Tax Deadline",
  hr_obligation: "HR Obligation",
};

const STATUS_COLOR: Record<ComplianceEvent["status"], string> = {
  upcoming: "var(--risk-low)",
  due: "var(--risk-medium)",
  overdue: "var(--risk-high)",
  resolved: "var(--muted-foreground)",
};

function buildCalendar(viewDate: Date, events: ComplianceEvent[]): CalDay[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  const eventsByDay = new Map<number, DayEvent>();
  for (const ev of events) {
    const d = new Date(ev.due_date + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      eventsByDay.set(d.getDate(), { color: TYPE_COLOR[ev.type], label: ev.category || TYPE_LABEL[ev.type] });
    }
  }

  const days: CalDay[] = [];
  for (let pos = 0; pos < 42; pos++) {
    let day: number;
    let muted = false;
    let date: Date;
    if (pos < startOffset) {
      day = daysInPrevMonth - startOffset + pos + 1;
      muted = true;
      date = new Date(year, month - 1, day);
    } else if (pos < startOffset + daysInMonth) {
      day = pos - startOffset + 1;
      date = new Date(year, month, day);
    } else {
      day = pos - startOffset - daysInMonth + 1;
      muted = true;
      date = new Date(year, month + 1, day);
    }
    const isToday = !muted && date.toDateString() === today.toDateString();
    days.push({ day, muted, today: isToday, date, event: !muted ? eventsByDay.get(day) : undefined });
  }
  return days;
}

export default function StayCompliantPage() {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<ComplianceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());

  const tokenFn = useCallback(() => getToken(), [getToken]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.complianceEvents
      .list(tokenFn)
      .then((evs) => {
        if (active) setEvents(evs);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Failed to load compliance events.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tokenFn]);

  const days = useMemo(() => buildCalendar(viewDate, events), [viewDate, events]);

  const upcoming = useMemo(() => {
    return [...events]
      .filter((e) => e.status !== "resolved")
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 6);
  }, [events]);

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="grid grid-cols-[1fr_320px] items-start gap-[18px] px-7 py-6 pb-10">
      {/* month grid */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-[18px] py-4">
          <div className="flex items-center gap-3">
            <div className="text-base font-bold">{monthLabel}</div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="flex size-[30px] items-center justify-center rounded-lg border border-border bg-card transition-colors hover:border-accent"
              >
                <ChevronLeft className="size-3.5 text-muted-foreground" strokeWidth={2} />
              </button>
              <button
                onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="flex size-[30px] items-center justify-center rounded-lg border border-border bg-card transition-colors hover:border-accent"
              >
                <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="flex gap-3 text-[10.5px] text-muted-foreground">
            <LegendDot color="#D97706" label="Renewals / Contracts" />
            <LegendDot color="#2A6FDB" label="Tax" />
            <LegendDot color="#1F8A5B" label="HR" />
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2 text-center text-[10.5px] font-semibold text-muted-foreground">
              {w}
            </div>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
            Loading calendar…
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map((d, i) => (
              <div
                key={i}
                className="min-h-[84px] border-b border-e border-border/60 p-2"
                style={{ background: d.today ? "#F4FAF7" : "transparent" }}
              >
                <div
                  className="font-mono-data text-xs font-semibold"
                  style={{ color: d.muted ? "#C5D0CB" : d.today ? "var(--primary)" : "var(--secondary-foreground)" }}
                >
                  {d.day}
                </div>
                {d.event && (
                  <div
                    className="mt-1.5 truncate rounded-[5px] px-1.5 py-0.5 text-[9.5px] font-semibold leading-tight text-white"
                    style={{ background: d.event.color }}
                  >
                    {d.event.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* upcoming deadlines */}
      <div className="flex flex-col gap-[18px]">
        {error && (
          <div className="flex items-center gap-2 rounded-[10px] border border-[#F8DADA] bg-[#FDF5F5] px-3.5 py-3 text-[12.5px] text-risk-high">
            <AlertTriangle className="size-3.5 flex-none" strokeWidth={1.8} />
            {error}
          </div>
        )}
        <div className="rounded-[14px] border border-border bg-card p-[16px_18px]">
          <div className="mb-3.5 text-sm font-bold">Upcoming deadlines</div>
          {upcoming.length === 0 && !loading ? (
            <div className="text-[12.5px] text-muted-foreground">No upcoming compliance events.</div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {upcoming.map((item) => {
                const d = new Date(item.due_date + "T00:00:00");
                const color = STATUS_COLOR[item.status];
                return (
                  <div key={item.id} className="flex gap-[11px]">
                    <div className="w-10 flex-none text-center">
                      <div className="font-mono-data text-base font-bold leading-none" style={{ color }}>
                        {String(d.getDate()).padStart(2, "0")}
                      </div>
                      <div className="text-[9px] text-muted-foreground">{d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</div>
                    </div>
                    <div className="flex-1 ps-[11px]" style={{ borderInlineStart: `2px solid ${color}33` }}>
                      <div className="text-[12.5px] font-semibold">{item.category || TYPE_LABEL[item.type]}</div>
                      <div className="text-[11px] text-muted-foreground">Status: {item.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-[14px] bg-sidebar p-[16px_18px] text-sidebar-foreground">
          <div className="mb-1.5 flex items-center gap-2">
            <BellRing className="size-4 text-[#5BD6A0]" strokeWidth={1.8} />
            <span className="text-[13px] font-bold">Reminders</span>
          </div>
          <div className="text-[11.5px] leading-[1.5] text-sidebar-foreground-muted">
            Email + dashboard alerts are sent via the <code>notify_emails</code> list on each event.
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
