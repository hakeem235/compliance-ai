import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/risk-badge";

const STATS = [
  { label: "Recent Reviews", value: "0" },
  { label: "Compliance Alerts", value: "0" },
  { label: "Expiring Contracts", value: "0" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview across Review, Stay Compliant, and Ask.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label} className="transition-shadow duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-foreground">{stat.value}</CardContent>
          </Card>
        ))}
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Average Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskBadge level="low" />
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        Data wiring pending — connects to Django REST API once backend endpoints are live.
      </p>
    </div>
  );
}
