"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ReviewPage() {
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
      setError(err instanceof ApiError ? err.message : "Failed to load documents.");
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
      setError(err instanceof ApiError ? err.message : "Upload failed.");
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
      setError(err instanceof ApiError ? err.message : "Failed to start analysis.");
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
          {uploading ? "Uploading…" : "Drag & drop a contract to analyze"}
        </div>
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

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[#F8DADA] bg-[#FDF5F5] px-4 py-3 text-[13px] text-risk-high">
          <AlertTriangle className="size-4 flex-none" strokeWidth={1.8} />
          {error}
        </div>
      )}

      {/* recent uploads */}
      <div className="mt-6">
        <div className="mb-3 text-sm font-bold">Recent uploads</div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
              Loading documents…
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <FileCheck2 className="size-6" aria-hidden="true" />
              No documents uploaded yet.
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
                      {doc.file_type.toUpperCase()} · {timeAgo(doc.created_at)} · {doc.status}
                    </div>
                  </div>
                  {score !== null ? (
                    <RiskBadge level={risk} score={score} label={risk === "high" ? "High" : risk === "medium" ? "Medium" : "Low"} />
                  ) : doc.status === "processing" ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11.5px] font-semibold text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" strokeWidth={2} />
                      Processing
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleAnalyze(e, doc.id)}
                      disabled={analyzingId === doc.id}
                      className="rounded-full bg-primary px-3 py-1 text-[11.5px] font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38] disabled:opacity-60"
                    >
                      {analyzingId === doc.id ? "Starting…" : "Analyze with AI"}
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
