"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@clerk/nextjs";
import { FileText, UploadCloud, FileCheck2, Loader2, AlertTriangle } from "lucide-react";
import { RiskBadge, type RiskLevel } from "@/components/risk-badge";
import { api, ApiError, type Document, type FileType } from "@/lib/api";

function riskFromScore(score: number | null): RiskLevel {
  if (score === null) return "low";
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

function fileTypeFromName(name: string): FileType {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "txt") return "txt";
  return "pdf";
}

function timeAgo(iso: string, t: ReturnType<typeof useTranslations>): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("timeJustNow");
  if (mins < 60) return t("timeMinutesAgo", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("timeHoursAgo", { count: hrs });
  return t("timeDaysAgo", { count: Math.floor(hrs / 24) });
}

export default function ReviewPage() {
  const t = useTranslations("Review");
  const { getToken } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tokenFn = useCallback(() => getToken(), [getToken]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await api.documents.list(tokenFn);
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [tokenFn]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleFileSelected(file: File) {
    setUploading(true);
    setError(null);
    try {
      // No real S3 upload is wired up yet (AWS keys unset server-side), so we
      // create the Document record with a synthetic placeholder s3_key. The
      // file's bytes are not actually persisted anywhere — see final report.
      const placeholderKey = `local/${crypto.randomUUID()}/${file.name}`;
      await api.documents.create(
        { filename: file.name, file_type: fileTypeFromName(file.name), s3_key: placeholderKey },
        tokenFn
      );
      await loadDocuments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorUpload"));
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyze(e: React.MouseEvent, docId: string) {
    e.preventDefault();
    e.stopPropagation();
    setAnalyzingId(docId);
    setError(null);
    try {
      await api.documents.analyze(docId, tokenFn);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorAnalyze"));
    } finally {
      setAnalyzingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] px-7 py-[26px] pb-10">
      {/* dropzone */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          e.target.value = "";
        }}
      />
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && !uploading) handleFileSelected(file);
        }}
        className="cursor-pointer rounded-[18px] border-2 border-dashed border-border bg-card p-[52px_30px] text-center transition-colors hover:border-accent hover:bg-muted/20"
      >
        <div className="mx-auto mb-[18px] flex size-16 items-center justify-center rounded-2xl bg-risk-low-bg">
          {uploading ? (
            <Loader2 className="size-[30px] animate-spin text-accent" strokeWidth={1.8} />
          ) : (
            <UploadCloud className="size-[30px] text-accent" strokeWidth={1.8} />
          )}
        </div>
        <div className="mb-1.5 text-lg font-bold">
          {uploading ? t("uploading") : t("dropzoneTitle")}
        </div>
        <div className="mb-[18px] text-[13.5px] text-muted-foreground">
          {t("dropzoneSubtitlePrefix")} <span className="font-semibold text-accent">{t("dropzoneBrowse")}</span> {t("dropzoneSubtitleSuffix")}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-[11.5px] font-semibold text-secondary-foreground/70">{t("badgePdf")}</span>
          <span className="rounded-full bg-muted px-3 py-1 text-[11.5px] font-semibold text-secondary-foreground/70">{t("badgeDocx")}</span>
          <span className="rounded-full bg-muted px-3 py-1 text-[11.5px] font-semibold text-secondary-foreground/70">{t("badgeTxt")}</span>
          <span className="rounded-full bg-risk-low-bg px-3 py-1 text-[11.5px] font-semibold text-accent">{t("badgeOcr")}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[#F8DADA] bg-[#FDF5F5] px-4 py-3 text-[13px] text-risk-high">
          <AlertTriangle className="size-4 flex-none" strokeWidth={1.8} />
          {error}
        </div>
      )}

      {/* recent uploads */}
      <div className="mt-6">
        <div className="mb-3 text-sm font-bold">{t("recentUploads")}</div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
              {t("loadingDocuments")}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <FileCheck2 className="size-6" aria-hidden="true" />
              {t("noDocuments")}
            </div>
          ) : (
            documents.map((doc, i) => {
              const score = doc.latest_analysis?.risk_score ?? null;
              const risk = riskFromScore(score);
              return (
                <Link
                  key={doc.id}
                  href={`/review/${doc.id}`}
                  className={`flex items-center gap-[13px] px-[18px] py-3.5 transition-colors hover:bg-muted/30 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <div
                    className="flex size-[34px] flex-none items-center justify-center rounded-lg"
                    style={{
                      background: risk === "high" ? "var(--risk-high-bg)" : risk === "medium" ? "var(--risk-medium-bg)" : "var(--risk-low-bg)",
                    }}
                  >
                    <FileText
                      className="size-4"
                      style={{ color: risk === "high" ? "var(--risk-high)" : risk === "medium" ? "var(--risk-medium)" : "var(--risk-low)" }}
                      strokeWidth={1.8}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold">{doc.filename}</div>
                    <div className="font-mono-data text-[11px] text-muted-foreground">
                      {doc.file_type.toUpperCase()} · {timeAgo(doc.created_at, t)} · {doc.status}
                    </div>
                  </div>
                  {score !== null ? (
                    <RiskBadge level={risk} score={score} label={risk === "high" ? t("riskHigh") : risk === "medium" ? t("riskMedium") : t("riskLow")} />
                  ) : doc.status === "processing" ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11.5px] font-semibold text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" strokeWidth={2} />
                      {t("processing")}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleAnalyze(e, doc.id)}
                      disabled={analyzingId === doc.id}
                      className="rounded-full bg-primary px-3 py-1 text-[11.5px] font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38] disabled:opacity-60"
                    >
                      {analyzingId === doc.id ? t("starting") : t("analyzeWithAi")}
                    </button>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
