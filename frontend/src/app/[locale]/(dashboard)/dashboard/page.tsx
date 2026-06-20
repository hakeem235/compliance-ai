"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@clerk/nextjs";
import { FileText, AlertTriangle, Clock, ShieldCheck, Loader2 } from "lucide-react";
import { RiskGauge } from "@/components/risk-gauge";
import { RiskBadge, type RiskLevel } from "@/components/risk-badge";
import { AiDisclaimer } from "@/components/citation-chip";
import { api, ApiError, type ComplianceEvent, type Document } from "@/lib/api";

function riskFromScore(score: number | null): RiskLevel {
  if (score === null) return "low";
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
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

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const { getToken } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [events, setEvents] = useState<ComplianceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tokenFn = useCallback(() => getToken(), [getToken]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([api.documents.list(tokenFn), api.complianceEvents.list(tokenFn)])
      .then(([docs, evs]) => {
        if (!active) return;
        setDocuments(docs);
        setEvents(evs);
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
  }, [tokenFn]);

  const stats = useMemo(() => {
    const analyzed = documents.filter((d) => d.latest_analysis !== null);
    const scores = analyzed.map((d) => d.latest_analysis!.risk_score ?? 0);
    const avgRisk = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highCount = scores.filter((s) => s >= 67).length;
    const medCount = scores.filter((s) => s >= 34 && s < 67).length;
    const lowCount = scores.filter((s) => s < 34).length;
    const activeAlerts = events.filter((e) => e.status === "due" || e.status === "overdue").length;
    const expiringSoon = events.filter((e) => {
      const days = (new Date(e.due_date).getTime() - Date.now()) / 86400000;
      return e.type === "contract_expiry" && days >= 0 && days <= 30;
    }).length;

    return { documentsCount: documents.length, avgRisk, highCount, medCount, lowCount, activeAlerts, expiringSoon };
  }, [documents, events]);

  const recentReviews = useMemo(
    () =>
      [...documents]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6),
    [documents]
  );

  const upcomingAlerts = useMemo(
    () =>
      [...events]
        .filter((e) => e.status !== "resolved")
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 4),
    [events]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-7 py-[26px] pb-10">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#F8DADA] bg-[#FDF5F5] px-4 py-3 text-[13px] text-risk-high">
          <AlertTriangle className="size-4 flex-none" strokeWidth={1.8} />
          {error}
        </div>
      )}

      {/* top row: risk gauge + 4 stats */}
      <div className="mb-[18px] grid grid-cols-[300px_1fr] gap-[18px]">
        <div className="relative overflow-hidden rounded-2xl bg-sidebar p-[22px] text-sidebar-foreground">
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 80% 0%,rgba(52,211,153,0.18),transparent 55%)" }}
          />
          <div className="relative">
            <div className="mb-1 text-[12.5px] font-semibold text-sidebar-foreground-muted">
              {t("orgRiskScore")}
            </div>
            <div className="flex items-center gap-[18px]">
              <RiskGauge score={stats.avgRisk} variant="dark">
                <div className="font-mono-data text-[30px] font-bold leading-none">{stats.avgRisk}</div>
                <div className="text-[9.5px] tracking-wide text-white/50">/ 100</div>
              </RiskGauge>
              <div className="flex-1">
                <div className="mb-[9px] inline-flex items-center gap-1.5 rounded-full bg-[#F5B544]/[0.18] px-2.5 py-1 text-[11.5px] font-semibold text-[#F7C56E]">
                  {stats.highCount > 0 ? t("needsAttention") : t("onTrack")}
                </div>
                <div className="text-[11.5px] leading-[1.5] text-white/60">
                  {stats.highCount === 1
                    ? t("highRiskSummary_one", { documentsCount: stats.documentsCount })
                    : t("highRiskSummary_other", { highCount: stats.highCount, documentsCount: stats.documentsCount })}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-[7px]">
              <div className="flex-1 rounded-[9px] bg-white/[0.06] px-1 py-2 text-center">
                <div className="font-mono-data text-[17px] font-bold text-[#FF8A8A]">{stats.highCount}</div>
                <div className="mt-px text-[9.5px] text-white/50">{t("high")}</div>
              </div>
              <div className="flex-1 rounded-[9px] bg-white/[0.06] px-1 py-2 text-center">
                <div className="font-mono-data text-[17px] font-bold text-[#F7C56E]">{stats.medCount}</div>
                <div className="mt-px text-[9.5px] text-white/50">{t("medium")}</div>
              </div>
              <div className="flex-1 rounded-[9px] bg-white/[0.06] px-1 py-2 text-center">
                <div className="font-mono-data text-[17px] font-bold text-[#5BD6A0]">{stats.lowCount}</div>
                <div className="mt-px text-[9.5px] text-white/50">{t("low")}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <StatCard label={t("statDocumentsReviewed")} value={String(stats.documentsCount)} icon={FileText} iconBg="bg-risk-low-bg" iconColor="#1F8A5B" />
          <StatCard label={t("statActiveAlerts")} value={String(stats.activeAlerts)} icon={AlertTriangle} iconBg="bg-risk-high-bg" iconColor="#DC2626" />
          <StatCard label={t("statExpiringContracts")} value={String(stats.expiringSoon)} icon={Clock} iconBg="bg-risk-medium-bg" iconColor="#D97706" />
          <StatCard label={t("statComplianceEvents")} value={String(events.length)} icon={ShieldCheck} iconBg="bg-risk-low-bg" iconColor="#1F8A5B" />
        </div>
      </div>

      {/* second row: recent reviews + right column */}
      <div className="grid grid-cols-[1fr_360px] gap-[18px]">
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-[18px] py-[13px]">
            <div className="text-sm font-bold">{t("recentReviews")}</div>
            <Link href="/review" className="text-xs font-semibold text-accent hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          {recentReviews.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">{t("noDocuments")}</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-[18px] py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{t("tableDocument")}</th>
                  <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{t("tableType")}</th>
                  <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{t("tableRisk")}</th>
                  <th className="px-[18px] py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{t("tableDate")}</th>
                </tr>
              </thead>
              <tbody>
                {recentReviews.map((doc) => {
                  const score = doc.latest_analysis?.risk_score ?? null;
                  const risk = riskFromScore(score);
                  return (
                    <tr key={doc.id} className="cursor-pointer border-t border-border/70 hover:bg-muted/30">
                      <td className="px-[18px] py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex size-[30px] flex-none items-center justify-center rounded-[7px]"
                            style={{
                              background:
                                risk === "high" ? "var(--risk-high-bg)" : risk === "medium" ? "var(--risk-medium-bg)" : "var(--risk-low-bg)",
                            }}
                          >
                            <FileText
                              className="size-3.5"
                              style={{ color: risk === "high" ? "var(--risk-high)" : risk === "medium" ? "var(--risk-medium)" : "var(--risk-low)" }}
                              strokeWidth={1.8}
                            />
                          </div>
                          <span className="text-[13px] font-semibold">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-[12.5px] text-muted-foreground">{doc.file_type.toUpperCase()}</td>
                      <td className="px-2 py-3">{score !== null ? <RiskBadge level={risk} score={score} /> : <span className="text-xs text-muted-foreground">{doc.status}</span>}</td>
                      <td className="px-[18px] py-3 font-mono-data text-xs text-muted-foreground">{timeAgo(doc.created_at, t)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col gap-[18px]">
          <div className="rounded-[14px] border border-border bg-card p-[16px_18px]">
            <div className="mb-[13px] text-sm font-bold">{t("complianceAlerts")}</div>
            {upcomingAlerts.length === 0 ? (
              <div className="text-[12.5px] text-muted-foreground">{t("noActiveAlerts")}</div>
            ) : (
              <div className="flex flex-col gap-[11px]">
                {upcomingAlerts.map((alert) => (
                  <div key={alert.id} className="flex gap-[11px]">
                    <span
                      className="mt-1.5 size-2 flex-none rounded-full"
                      style={{ background: alert.status === "overdue" || alert.status === "due" ? "var(--risk-high)" : "var(--risk-medium)" }}
                    />
                    <div>
                      <div className="text-[12.5px] font-semibold leading-tight">{alert.type.replace(/_/g, " ")}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{t("due", { date: alert.due_date, status: alert.status })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[14px] border border-border bg-card p-[16px_18px]">
            <div className="mb-[13px] flex items-center justify-between">
              <div className="text-sm font-bold">{t("expiringContracts")}</div>
              <Link href="/stay-compliant" className="text-xs font-semibold text-accent hover:underline">
                {t("calendarLink")}
              </Link>
            </div>
            {stats.expiringSoon === 0 ? (
              <div className="text-[12.5px] text-muted-foreground">{t("noExpiringContracts")}</div>
            ) : (
              <div className="text-[12.5px] text-muted-foreground">
                {stats.expiringSoon === 1
                  ? t("expiringSummary_one")
                  : t("expiringSummary_other", { count: stats.expiringSoon })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AiDisclaimer className="mt-5" />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  icon: typeof FileText;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-[17px_18px]">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={`flex size-[30px] items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="size-4" style={{ color: iconColor }} strokeWidth={1.8} />
        </div>
      </div>
      <div className="mt-2.5 font-mono-data text-[28px] font-bold tracking-tight">{value}</div>
    </div>
  );
}
