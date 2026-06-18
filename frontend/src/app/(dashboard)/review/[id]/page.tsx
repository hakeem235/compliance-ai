import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge, type RiskLevel } from "@/components/risk-badge";
import { CitationChip, AiDisclaimer } from "@/components/citation-chip";

const FINDINGS: { clause: string; risk: RiskLevel; note: string; citation: string }[] = [
  {
    clause: "Termination Notice Period",
    risk: "high",
    note: "Notice period is shorter than the statutory minimum, which may expose the employer to a wrongful-termination claim.",
    citation: "Saudi Labor Law, Art. 75",
  },
  {
    clause: "Non-Compete Scope",
    risk: "medium",
    note: "Geographic scope is broader than typically enforced; consider narrowing to reduce dispute risk.",
    citation: "Document p. 4",
  },
  {
    clause: "Confidentiality",
    risk: "low",
    note: "Standard confidentiality language, consistent with market practice.",
    citation: "Document p. 2",
  },
];

export default async function DocumentAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analysis — Document {id}</h1>
          <p className="text-sm text-muted-foreground">Clause-by-clause findings from the AI Contract Review Engine.</p>
        </div>
        <RiskBadge level="medium" score={62} />
      </div>

      <div className="space-y-3">
        {FINDINGS.map((finding) => (
          <Card key={finding.clause}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>{finding.clause}</CardTitle>
              <RiskBadge level={finding.risk} />
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{finding.note}</p>
              <CitationChip source={finding.citation} />
            </CardContent>
          </Card>
        ))}
      </div>

      <AiDisclaimer />
    </div>
  );
}
