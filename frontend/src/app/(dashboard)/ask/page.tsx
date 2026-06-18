import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CitationChip, AiDisclaimer } from "@/components/citation-chip";

export default function AskPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <h1 className="text-2xl font-semibold">Ask</h1>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-border p-4">
        <div className="flex justify-end">
          <Card className="max-w-md bg-primary text-primary-foreground">
            <CardContent className="text-sm">
              Can I terminate an employee without notice during their probation period?
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-start">
          <Card className="max-w-md">
            <CardContent className="space-y-2 text-sm">
              <p>
                During probation, an employer may terminate the contract without notice or end-of-service
                indemnity, provided the reason is not discriminatory and the probation period is stated in
                the contract.
              </p>
              <CitationChip source="Saudi Labor Law, Art. 53" />
            </CardContent>
          </Card>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Chat pipeline pending backend integration — responses shown are illustrative placeholders.
        </p>
      </div>

      <form className="flex gap-2">
        <Input placeholder="Ask ComplianceAI..." disabled />
      </form>
      <AiDisclaimer />
    </div>
  );
}
