import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge, type RiskLevel } from "@/components/risk-badge";

const EVENTS: { id: string; title: string; dueDate: string; urgency: RiskLevel; label: string }[] = [
  { id: "1", title: "Commercial registration renewal", dueDate: "2026-06-25", urgency: "high", label: "Due soon" },
  { id: "2", title: "GOSI contribution filing", dueDate: "2026-07-05", urgency: "medium", label: "Upcoming" },
  { id: "3", title: "Employment contract review — Q3 batch", dueDate: "2026-08-01", urgency: "low", label: "On track" },
];

export default function StayCompliantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Stay Compliant</h1>
        <p className="text-sm text-muted-foreground">
          License renewals, contract expirations, tax deadlines, and HR obligations.
        </p>
      </div>

      <div className="space-y-2">
        {EVENTS.map((event) => (
          <Card key={event.id}>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CalendarClock className="size-5 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">Due {event.dueDate}</p>
                </div>
              </div>
              <RiskBadge level={event.urgency} label={event.label} />
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Live data connects once the compliance_events API is wired.
      </p>
    </div>
  );
}
