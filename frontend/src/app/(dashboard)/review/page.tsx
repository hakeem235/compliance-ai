import Link from "next/link";
import { FileText, UploadCloud, FileCheck2 } from "lucide-react";
import { RiskBadge, type RiskLevel } from "@/components/risk-badge";

const DOCUMENTS: { id: string; name: string; type: string; uploadedAt: string; score: number; risk: RiskLevel }[] = [
  { id: "1", name: "CloudServe MSA v3.docx", type: "Vendor", uploadedAt: "2h ago", score: 78, risk: "high" },
  { id: "2", name: "Employment_Contract_Sara.pdf", type: "Employment", uploadedAt: "5h ago", score: 54, risk: "medium" },
  { id: "3", name: "NDA_Mutual_Tahaluf.docx", type: "NDA", uploadedAt: "1d ago", score: 22, risk: "low" },
];

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-7 py-[26px] pb-10">
      {/* dropzone */}
      <div className="cursor-pointer rounded-[18px] border-2 border-dashed border-border bg-card p-[52px_30px] text-center transition-colors hover:border-accent hover:bg-muted/20">
        <div className="mx-auto mb-[18px] flex size-16 items-center justify-center rounded-2xl bg-risk-low-bg">
          <UploadCloud className="size-[30px] text-accent" strokeWidth={1.8} />
        </div>
        <div className="mb-1.5 text-lg font-bold">Drag &amp; drop a contract to analyze</div>
        <div className="mb-[18px] text-[13.5px] text-muted-foreground">
          or <span className="font-semibold text-accent">browse your files</span> — we&apos;ll extract text, run
          OCR if needed, and review it
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-[11.5px] font-semibold text-secondary-foreground/70">PDF</span>
          <span className="rounded-full bg-muted px-3 py-1 text-[11.5px] font-semibold text-secondary-foreground/70">DOCX</span>
          <span className="rounded-full bg-muted px-3 py-1 text-[11.5px] font-semibold text-secondary-foreground/70">TXT</span>
          <span className="rounded-full bg-risk-low-bg px-3 py-1 text-[11.5px] font-semibold text-accent">OCR enabled</span>
        </div>
      </div>

      {/* recent uploads */}
      <div className="mt-6">
        <div className="mb-3 text-sm font-bold">Recent uploads</div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          {DOCUMENTS.map((doc, i) => (
            <Link
              key={doc.id}
              href={`/review/${doc.id}`}
              className={`flex items-center gap-[13px] px-[18px] py-3.5 transition-colors hover:bg-muted/30 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div
                className="flex size-[34px] flex-none items-center justify-center rounded-lg"
                style={{
                  background:
                    doc.risk === "high" ? "var(--risk-high-bg)" : doc.risk === "medium" ? "var(--risk-medium-bg)" : "var(--risk-low-bg)",
                }}
              >
                <FileText
                  className="size-4"
                  style={{
                    color: doc.risk === "high" ? "var(--risk-high)" : doc.risk === "medium" ? "var(--risk-medium)" : "var(--risk-low)",
                  }}
                  strokeWidth={1.8}
                />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold">{doc.name}</div>
                <div className="font-mono-data text-[11px] text-muted-foreground">
                  {doc.type} · {doc.uploadedAt}
                </div>
              </div>
              <RiskBadge
                level={doc.risk}
                score={doc.score}
                label={doc.risk === "high" ? "High" : doc.risk === "medium" ? "Medium" : "Low"}
              />
            </Link>
          ))}
          {DOCUMENTS.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <FileCheck2 className="size-6" aria-hidden="true" />
              No documents uploaded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
