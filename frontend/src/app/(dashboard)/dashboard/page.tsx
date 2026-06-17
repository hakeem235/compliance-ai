import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Reviews</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">0</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Compliance Alerts</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">0</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Expiring Contracts</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">0</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Average Risk Score</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">—</CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        Data wiring pending — connects to Django REST API once backend endpoints are live.
      </p>
    </div>
  );
}
