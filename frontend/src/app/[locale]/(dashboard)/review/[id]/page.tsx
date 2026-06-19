"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { FileText, MessagesSquare, Download, Loader2, AlertTriangle, Hourglass } from "lucide-react";
import { RiskBadge, type RiskLevel } from "@/components/risk-badge";
import { CitationChip } from "@/components/citation-chip";
import { RiskGauge } from "@/components/risk-gauge";
import { api, ApiError, type Document } from "@/lib/api";
import { REGULATIONS } from "@/lib/regulations";

type Finding = {
  level: RiskLevel;
  ref: string;
  titleKey: string;
  citation?: string;
  hasTranslatedCitation?: boolean;
};

// Illustrative-only findings shown when no real DocumentAnalysis exists yet —
// the AI Contract Review Engine isn't wired up server-side (no
// OPENAI_API_KEY/PINECONE_API_KEY), so every real document currently has
// latest_analysis === null. This block is clearly labeled as an example below.
// Titles/notes/recommendations/citations are translated via
// ReviewDetail.findings.<key>.* where available; citation strings sourced
// from src/lib/regulations.ts (out of scope for this task) remain in
// English — see final report.
const EXAMPLE_FINDINGS: Finding[] = [
  { level: "high", ref: "§9.2", titleKey: "indemnity", hasTranslatedCitation: true },
  { level: "high", ref: "§11.3", titleKey: "termination", hasTranslatedCitation: true },
  { level: "medium", ref: "§15.1", titleKey: "ipOwnership", hasTranslatedCitation: true },
  { level: "low", ref: "§18.1 · missing", titleKey: "governingLaw", citation: REGULATIONS.companiesLaw },
  { level: "medium", ref: "§22.4", titleKey: "dataProtection", citation: REGULATIONS.pdpl },
];

const LEVEL_STYLE: Record<RiskLevel, { borderColor: string; borderInlineStart: string }> = {
  high: { borderColor: "#F2D4D4", borderInlineStart: "3px solid var(--risk-high)" },
  medium: { borderColor: "#F3E2C9", borderInlineStart: "3px solid var(--risk-medium)" },
  low: { borderColor: "#D7EEE3", borderInlineStart: "3px solid var(--risk-low)" },
};

export default function DocumentAnalysisPage() {
  const t = useTranslations("ReviewDetail");
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { getToken } = useAuth();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tokenFn = useCallback(() => getToken(), [getToken]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.documents
      .get(id, tokenFn)
      .then((d) => {
        if (active) setDoc(d);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : t("errorLoad"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, tokenFn]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
        {t("loading")}
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="mx-auto max-w-[700px] px-7 py-16 text-center">
        <AlertTriangle className="mx-auto mb-3 size-8 text-risk-high" strokeWidth={1.6} />
        <div className="text-base font-bold">{t("loadErrorTitle")}</div>
        <div className="mt-1.5 text-sm text-muted-foreground">{error ?? t("documentNotFound")}</div>
      </div>
    );
  }

  const analysis = doc.latest_analysis;
  const hasRealAnalysis = !!analysis && analysis.findings.length > 0;

  return (
    <div className="mx-auto max-w-[1340px] px-7 py-[22px] pb-10">
      {/* doc header */}
      <div className="mb-[18px] flex flex-wrap items-center gap-3.5">
        <div className="flex size-11 flex-none items-center justify-center rounded-[11px] bg-risk-high-bg">
          <FileText className="size-[22px] text-risk-high" strokeWidth={1.8} />
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="text-lg font-bold tracking-tight">{doc.filename}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground/70">
              {doc.file_type.toUpperCase()}
            </span>
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground/70">{t("version", { version: doc.version })}</span>
            <span className="font-mono-data rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground/70">
              {t("idLabel", { status: doc.status, id: doc.id })}
            </span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button className="flex h-[38px] items-center gap-[7px] rounded-[10px] border border-border bg-card px-[15px] text-[13px] font-semibold text-secondary-foreground transition-colors hover:border-accent">
            <MessagesSquare className="size-[15px]" strokeWidth={1.8} />
            {t("askAssistant")}
          </button>
          <button
            disabled={!hasRealAnalysis}
            className="flex h-[38px] items-center gap-[7px] rounded-[10px] bg-primary px-[18px] text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-[15px]" strokeWidth={1.8} />
            {t("exportReport")}
          </button>
        </div>
      </div>

      {!hasRealAnalysis ? (
        <div className="mb-[18px] rounded-[14px] border border-[#EDE6C8] bg-[#FBFAF4] p-6 text-center">
          <Hourglass className="mx-auto mb-2.5 size-6 text-[#9A7B12]" strokeWidth={1.7} />
          <div className="text-[14px] font-bold text-[#7A6510]">{t("pendingTitle")}</div>
          <div className="mx-auto mt-1.5 max-w-[520px] text-[12.5px] leading-[1.5] text-secondary-foreground/70">
            {doc.status === "processing" ? t("pendingProcessing") : t("pendingNotAnalyzed")}
          </div>
          <div className="mx-auto mt-4 max-w-[760px] rounded-[10px] border border-border bg-card p-3 text-start text-[11.5px] text-muted-foreground">
            {t.rich("illustrativeNotice", { b: (chunks) => <b>{chunks}</b> })}
          </div>
        </div>
      ) : null}

      {/* risk overview */}
      <div className="mb-[18px] grid grid-cols-[280px_1fr] gap-[18px] opacity-100" style={!hasRealAnalysis ? { opacity: 0.55 } : undefined}>
        <div className="flex flex-col items-center rounded-[14px] border border-border bg-card p-5">
          <RiskGauge score={hasRealAnalysis ? analysis!.risk_score ?? 0 : 78} size={128} strokeWidth={13} color="#DC2626">
            <div className="font-mono-data text-[40px] font-bold leading-none text-risk-high">
              {hasRealAnalysis ? analysis!.risk_score ?? "—" : 78}
            </div>
            <div className="text-[10px] text-muted-foreground">{t("riskScore")}</div>
          </RiskGauge>
          <div className="mt-3.5">
            <RiskBadge level="high" label={t("highRisk")} className="px-[13px] py-[5px] text-[12.5px] font-bold" />
          </div>
          <div className="mt-4 flex w-full flex-col gap-2.5">
            <SeverityBar label={t("severityHigh")} value={4} pct={80} color="var(--risk-high)" />
            <SeverityBar label={t("severityMedium")} value={5} pct={55} color="var(--risk-medium)" />
            <SeverityBar label={t("severityLow")} value={8} pct={35} color="var(--risk-low)" />
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-card p-5">
          <div className="mb-[11px] flex items-center gap-2">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="m12 3 1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10z" stroke="#1F8A5B" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            <div className="text-sm font-bold">{t("aiRiskSummary")}</div>
          </div>
          <p className="mb-3.5 text-[13.5px] leading-[1.65] text-secondary-foreground/80">
            {hasRealAnalysis ? analysis!.risk_summary || t("noSummary") : t("exampleSummary")}
          </p>
        </div>
      </div>

      {/* two-column: doc viewer + findings */}
      <div className="grid grid-cols-2 items-start gap-[18px]" style={!hasRealAnalysis ? { opacity: 0.55 } : undefined}>
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-[13px]">
            <div className="text-[13px] font-bold">{t("document")}</div>
            <div className="flex items-center gap-[11px] text-[10.5px] text-muted-foreground">
              <LegendDot color="#FBD5D5" label={t("legendHigh")} />
              <LegendDot color="#FBE4C0" label={t("legendMedium")} />
              <LegendDot color="#CDEBDC" label={t("legendLow")} />
            </div>
          </div>
          <div className="ca-scroll max-h-[560px] overflow-y-auto px-[22px] py-5 font-mono-data text-[12.5px] leading-[1.9] text-secondary-foreground/80">
            <p className="text-secondary-foreground/60">
              {hasRealAnalysis ? t("docTextUnavailableReal") : t("docTextUnavailableExample")}
            </p>
          </div>
        </div>

        {/* findings */}
        <div>
          <div className="ca-scroll flex max-h-[560px] flex-col gap-3 overflow-y-auto pe-1">
            {hasRealAnalysis
              ? analysis!.findings.map((f, idx) => (
                  <div key={idx} className="rounded-[11px] border bg-card p-[15px]" style={LEVEL_STYLE[f.risk_level]}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className="rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          background:
                            f.risk_level === "high" ? "var(--risk-high-bg)" : f.risk_level === "medium" ? "var(--risk-medium-bg)" : "var(--risk-low-bg)",
                          color: f.risk_level === "high" ? "var(--risk-high)" : f.risk_level === "medium" ? "var(--risk-medium)" : "var(--risk-low)",
                        }}
                      >
                        {f.risk_level}
                      </span>
                      <span className="font-mono-data text-[11px] text-muted-foreground">{f.category}</span>
                    </div>
                    <div className="mb-1.5 text-[13.5px] font-bold">{f.category}</div>
                    <div className="mb-2.5 text-[12.5px] leading-[1.55] text-muted-foreground">{f.clause_text}</div>
                    <div className="mb-2.5 rounded-[9px] bg-[#F4FAF7] p-[10px_12px]">
                      <div className="mb-1 text-[10.5px] font-bold text-accent">{t("recommendation")}</div>
                      <div className="text-xs leading-[1.5] text-secondary-foreground/80">{f.recommendation}</div>
                    </div>
                    {f.citation_source ? <CitationChip source={f.citation_source} /> : null}
                  </div>
                ))
              : EXAMPLE_FINDINGS.map((f, idx) => (
                  <div key={idx} className="rounded-[11px] border bg-card p-[15px]" style={LEVEL_STYLE[f.level]}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className="rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          background:
                            f.level === "high" ? "var(--risk-high-bg)" : f.level === "medium" ? "var(--risk-medium-bg)" : "var(--risk-low-bg)",
                          color: f.level === "high" ? "var(--risk-high)" : f.level === "medium" ? "var(--risk-medium)" : "var(--risk-low)",
                        }}
                      >
                        {f.level}
                      </span>
                      <span className="font-mono-data text-[11px] text-muted-foreground">{f.ref}</span>
                    </div>
                    <div className="mb-1.5 text-[13.5px] font-bold">{t(`findings.${f.titleKey}.title`)}</div>
                    <div className="mb-2.5 text-[12.5px] leading-[1.55] text-muted-foreground">{t(`findings.${f.titleKey}.note`)}</div>
                    <div className="mb-2.5 rounded-[9px] bg-[#F4FAF7] p-[10px_12px]">
                      <div className="mb-1 text-[10.5px] font-bold text-accent">{t("recommendation")}</div>
                      <div className="text-xs leading-[1.5] text-secondary-foreground/80">{t(`findings.${f.titleKey}.recommendation`)}</div>
                    </div>
                    {f.hasTranslatedCitation ? (
                      <CitationChip source={t(`findings.${f.titleKey}.citation`)} />
                    ) : f.citation ? (
                      <CitationChip source={f.citation} />
                    ) : null}
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SeverityBar({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-[3px] flex justify-between text-[11.5px]">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono-data font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-[5px] rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
