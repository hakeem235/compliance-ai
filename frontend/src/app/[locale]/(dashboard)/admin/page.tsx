"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { Database, Loader2, ShieldAlert } from "lucide-react";
import { api, ApiError, type AdminStats, type AuditLogEntry } from "@/lib/api";
import { EmailConfigCard } from "@/components/email-config-card";

const JURISDICTIONS = [
  { key: "saudiLive", active: true },
  { key: "uaeQ3", active: false },
  { key: "bahrain", active: false },
  { key: "kuwait", active: false },
  { key: "qatar", active: false },
  { key: "ukUsa", active: false },
];

function formatStorage(bytes: number): { value: string; unit: string } {
  if (bytes >= 1_000_000_000) return { value: (bytes / 1_000_000_000).toFixed(1), unit: " GB" };
  if (bytes >= 1_000_000) return { value: (bytes / 1_000_000).toFixed(1), unit: " MB" };
  if (bytes >= 1_000) return { value: (bytes / 1_000).toFixed(0), unit: " KB" };
  return { value: String(bytes), unit: " B" };
}

function actionVerb(action: string, t: (k: string) => string): string {
  const method = action.split(" ")[0];
  if (method === "POST") return t("verbCreated");
  if (method === "DELETE") return t("verbDeleted");
  if (method === "PUT" || method === "PATCH") return t("verbUpdated");
  return action;
}

export default function AdminPage() {
  const t = useTranslations("Admin");
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken(), [getToken]);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    Promise.all([api.admin.stats(tokenFn), api.admin.auditLogs(tokenFn)])
      .then(([s, l]) => {
        setStats(s);
        setLogs(l);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) setRestricted(true);
      })
      .finally(() => setLoading(false));
  }, [tokenFn]);

  if (restricted) {
    return (
      <div className="mx-auto max-w-[560px] px-7 py-20 text-center">
        <ShieldAlert className="mx-auto mb-3 size-8 text-risk-medium" strokeWidth={1.6} />
        <div className="text-base font-bold">{t("restrictedTitle")}</div>
        <div className="mt-1.5 text-sm text-muted-foreground">{t("restrictedBody")}</div>
      </div>
    );
  }

  const storage = formatStorage(stats?.storage_bytes ?? 0);
  const STAT_CELLS = [
    { key: "activeUsers", value: stats ? String(stats.active_users) : "—" },
    { key: "docsAnalyzed", value: stats ? String(stats.docs_analyzed) : "—" },
    { key: "aiCalls", value: stats ? String(stats.ai_calls) : "—" },
    { key: "storageUsed", value: stats ? storage.value : "—", unit: stats ? storage.unit : "" },
  ];

  return (
    <div className="mx-auto max-w-[1180px] px-7 py-6 pb-10">
      {/* stats */}
      <div className="mb-[18px] grid grid-cols-4 gap-3.5">
        {STAT_CELLS.map((s) => (
          <div key={s.key} className="rounded-[14px] border border-border bg-card p-[16px_18px]">
            <div className="text-[11.5px] font-medium text-muted-foreground">{t(`stats.${s.key}`)}</div>
            <div className="font-mono-data mt-1.5 text-2xl font-bold">
              {s.value}
              {s.unit && <span className="text-sm text-muted-foreground">{s.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_360px] items-start gap-[18px]">
        {/* audit log */}
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-[18px] py-4">
            <div className="text-sm font-bold">{t("auditLog")}</div>
            <span className="rounded-full bg-risk-low-bg px-2.5 py-0.5 text-[11px] font-semibold text-accent">
              {t("immutableRbac")}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
              {t("loading")}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-[12.5px] text-muted-foreground">{t("noAuditEvents")}</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-[18px] py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">{t("event")}</th>
                  <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">{t("actor")}</th>
                  <th className="px-[18px] py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">{t("time")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => {
                  const d = new Date(row.created_at);
                  return (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="px-[18px] py-[11px]">
                        <div className="text-[12.5px] font-semibold">
                          {actionVerb(row.action, t)} {row.resource_type && <span className="text-muted-foreground">· {row.resource_type}</span>}
                        </div>
                        <div className="font-mono-data text-[10.5px] text-muted-foreground">{row.action}</div>
                      </td>
                      <td className="px-2 py-[11px] text-xs text-secondary-foreground/80">{row.actor_name || "—"}</td>
                      <td className="font-mono-data px-[18px] py-[11px] text-[11.5px] text-muted-foreground">
                        {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* email config + knowledge base + roadmap */}
        <div className="flex flex-col gap-[18px]">
          <EmailConfigCard />

          <div className="rounded-[14px] border border-border bg-card p-[18px]">
            <div className="mb-3.5 flex items-center gap-2">
              <Database className="size-[17px] text-primary" strokeWidth={1.7} />
              <div className="text-sm font-bold">{t("ragKnowledgeBase")}</div>
            </div>
            <div className="rounded-[10px] border border-dashed border-border bg-muted/30 p-4 text-center">
              <div className="text-[12.5px] font-semibold">{t("ragNotConnectedTitle")}</div>
              <div className="mt-1 text-[11.5px] leading-[1.5] text-muted-foreground">{t("ragNotConnectedBody")}</div>
            </div>
            <button
              disabled
              title={t("ragNotConnectedTitle")}
              className="mt-3.5 h-[38px] w-full cursor-not-allowed rounded-[9px] border border-border bg-card text-[12.5px] font-semibold text-muted-foreground opacity-60"
            >
              {t("addSource")}
            </button>
          </div>

          <div className="rounded-[14px] border border-border bg-card p-[18px]">
            <div className="mb-[11px] text-[13px] font-bold">{t("jurisdictionRoadmap")}</div>
            <div className="flex flex-wrap gap-[7px]">
              {JURISDICTIONS.map((j) => (
                <span
                  key={j.key}
                  className={`rounded-full px-[11px] py-1 text-[11px] font-semibold ${
                    j.active ? "bg-risk-low-bg text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t(`jurisdictions.${j.key}`)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
