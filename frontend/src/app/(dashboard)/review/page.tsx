import Link from "next/link";
import { FileText, UploadCloud } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge, type RiskLevel } from "@/components/risk-badge";

const DOCUMENTS: { id: string; name: string; uploadedAt: string; risk: RiskLevel }[] = [
  { id: "1", name: "Employment Agreement — Ahmed K.", uploadedAt: "2026-06-12", risk: "medium" },
  { id: "2", name: "NDA — Vendor Onboarding", uploadedAt: "2026-06-10", risk: "low" },
  { id: "3", name: "Commercial Lease — Riyadh Office", uploadedAt: "2026-06-02", risk: "high" },
];

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Review</h1>
        <p className="text-sm text-muted-foreground">Upload a contract for AI clause analysis and risk scoring.</p>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        <UploadCloud className="size-6 text-muted-foreground" aria-hidden="true" />
        Drag and drop a PDF, DOCX, or TXT file here to upload — upload pipeline pending backend integration.
      </div>

      <div className="space-y-2">
        {DOCUMENTS.map((doc) => (
          <Link key={doc.id} href={`/review/${doc.id}`}>
            <Card className="cursor-pointer transition-shadow duration-200 hover:shadow-md">
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">Uploaded {doc.uploadedAt}</p>
                  </div>
                </div>
                <RiskBadge level={doc.risk} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
