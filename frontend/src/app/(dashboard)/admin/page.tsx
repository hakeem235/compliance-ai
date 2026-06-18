import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Panel</h1>
      <Card>
        <CardHeader>
          <CardTitle>Users &amp; audit log</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Org-wide user/role management and audit log viewer — admin-role gated, pending RBAC wiring.
        </CardContent>
      </Card>
    </div>
  );
}
