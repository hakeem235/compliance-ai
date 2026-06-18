import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <Card>
        <CardHeader>
          <CardTitle>Plan &amp; payment</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Plan and payment management — pending billing provider integration.
        </CardContent>
      </Card>
    </div>
  );
}
