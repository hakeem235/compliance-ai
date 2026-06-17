import { Badge } from "@/components/ui/badge";

export default async function DocumentAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analysis — Document {id}</h1>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Risk score:</span>
        <Badge variant="secondary">Pending analysis</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Clause-by-clause findings will render here once the AI Contract Review Engine endpoint is wired.
      </p>
    </div>
  );
}
