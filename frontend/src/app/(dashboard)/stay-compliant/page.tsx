import { ChevronLeft, ChevronRight, BellRing } from "lucide-react";

type DayEvent = { color: string; label: string };
type CalDay = { day: number; muted: boolean; today?: boolean; event?: DayEvent };

const EVENTS: Record<number, DayEvent> = {
  6: { color: "#DC2626", label: "PDPL privacy notice" },
  12: { color: "#DC2626", label: "GOSI — May filing" },
  15: { color: "#2A6FDB", label: "VAT return Q2" },
  21: { color: "#D97706", label: "CR renewal" },
  25: { color: "#1F8A5B", label: "End-of-service — Ali" },
  28: { color: "#D97706", label: "CloudServe MSA expires" },
};

function buildCalendar(): CalDay[] {
  const days: CalDay[] = [];
  for (let pos = 0; pos < 42; pos++) {
    let day: number;
    let muted = false;
    if (pos === 0) {
      day = 31;
      muted = true;
    } else if (pos <= 30) {
      day = pos;
    } else {
      day = pos - 30;
      muted = true;
    }
    const today = !muted && day === 18;
    days.push({ day, muted, today, event: !muted ? EVENTS[day] : undefined });
  }
  return days;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const DEADLINES = [
  { day: "06", mon: "JUN", color: "var(--risk-high)", title: "Update PDPL privacy notice", note: "Compliance · email reminder set" },
  { day: "12", mon: "JUN", color: "var(--risk-high)", title: "GOSI contributions — May", note: "HR · recurring monthly" },
  { day: "15", mon: "JUN", color: "#2A6FDB", title: "VAT return — Q2", note: "Tax · ZATCA portal" },
  { day: "21", mon: "JUN", color: "var(--risk-medium)", title: "Commercial registration renewal", note: "Compliance · MCI" },
  { day: "28", mon: "JUN", color: "var(--risk-medium)", title: "CloudServe MSA expires", note: "Contract · auto-renews" },
];

export default function StayCompliantPage() {
  const days = buildCalendar();

  return (
    <div className="grid grid-cols-[1fr_320px] items-start gap-[18px] px-7 py-6 pb-10">
      {/* month grid */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-[18px] py-4">
          <div className="flex items-center gap-3">
            <div className="text-base font-bold">June 2026</div>
            <div className="flex gap-1">
              <button className="flex size-[30px] items-center justify-center rounded-lg border border-border bg-card transition-colors hover:border-accent">
                <ChevronLeft className="size-3.5 text-muted-foreground" strokeWidth={2} />
              </button>
              <button className="flex size-[30px] items-center justify-center rounded-lg border border-border bg-card transition-colors hover:border-accent">
                <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="flex gap-3 text-[10.5px] text-muted-foreground">
            <LegendDot color="#DC2626" label="Compliance" />
            <LegendDot color="#D97706" label="Contracts" />
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
      </div>

      {/* upcoming deadlines */}
      <div className="flex flex-col gap-[18px]">
        <div className="rounded-[14px] border border-border bg-card p-[16px_18px]">
          <div className="mb-3.5 text-sm font-bold">Upcoming deadlines</div>
          <div className="flex flex-col gap-3.5">
            {DEADLINES.map((item) => (
              <div key={item.title} className="flex gap-[11px]">
                <div className="w-10 flex-none text-center">
                  <div className="font-mono-data text-base font-bold leading-none" style={{ color: item.color }}>
                    {item.day}
                  </div>
                  <div className="text-[9px] text-muted-foreground">{item.mon}</div>
                </div>
                <div className="flex-1 ps-[11px]" style={{ borderInlineStart: `2px solid ${item.color}33` }}>
                  <div className="text-[12.5px] font-semibold">{item.title}</div>
                  <div className="text-[11px] text-muted-foreground">{item.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[14px] bg-sidebar p-[16px_18px] text-sidebar-foreground">
          <div className="mb-1.5 flex items-center gap-2">
            <BellRing className="size-4 text-[#5BD6A0]" strokeWidth={1.8} />
            <span className="text-[13px] font-bold">Reminders</span>
          </div>
          <div className="text-[11.5px] leading-[1.5] text-sidebar-foreground-muted">
            Email + dashboard alerts are sent 14, 7, and 1 day before each deadline. 3 reminders are scheduled this
            week.
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
