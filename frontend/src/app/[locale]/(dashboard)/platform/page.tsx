"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth";
import { ShieldAlert, Loader2, Search, Users, CreditCard, RefreshCcw, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  api,
  ApiError,
  type PlatformStats,
  type ClientSummary,
  type ClientDetail,
  type ClientPayment,
} from "@/lib/api";

const PLAN_OPTIONS = ["starter", "growth", "enterprise"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-risk-low-bg text-accent",
    past_due: "bg-risk-medium-bg text-risk-medium",
    canceled: "bg-muted text-muted-foreground",
    none: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${map[status] ?? map.none}`}>{status}</span>;
}

export default function PlatformPage() {
  const t = useTranslations("Platform");
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken(), [getToken]);

  const [restricted, setRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadClients = useCallback(
    async (q: string) => {
      try {
        const list = await api.backoffice.clients(tokenFn, q);
        setClients(list);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) setRestricted(true);
      }
    },
    [tokenFn]
  );

  useEffect(() => {
    Promise.all([api.backoffice.stats(tokenFn), api.backoffice.clients(tokenFn)])
      .then(([s, list]) => {
        setStats(s);
        setClients(list);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) setRestricted(true);
      })
      .finally(() => setLoading(false));
  }, [tokenFn]);

  async function openClient(id: string) {
    setSelectedId(id);
    setDetail(null);
    setPayments([]);
    setNote(null);
    setDetailLoading(true);
    try {
      const d = await api.backoffice.client(id, tokenFn);
      setDetail(d);
      // Payments are best-effort: a 503 (Stripe unconfigured) just leaves the list empty.
      try {
        setPayments(await api.backoffice.payments(id, tokenFn));
      } catch {
        setPayments([]);
      }
    } catch {
      setNote({ ok: false, msg: t("actionFailed") });
    } finally {
      setDetailLoading(false);
    }
  }

  async function runAction(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await fn();
      if (selectedId) {
        setDetail(await api.backoffice.client(selectedId, tokenFn));
      }
      const [s] = await Promise.all([api.backoffice.stats(tokenFn), loadClients(query)]);
      setStats(s);
      setNote({ ok: true, msg: t("actionDone") });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("actionFailed");
      setNote({ ok: false, msg });
    } finally {
      setBusy(false);
    }
  }

  if (restricted) {
    return (
      <div className="mx-auto max-w-[560px] px-7 py-20 text-center">
        <ShieldAlert className="mx-auto mb-3 size-8 text-risk-medium" strokeWidth={1.6} />
        <div className="text-base font-bold">{t("restrictedTitle")}</div>
        <div className="mt-1.5 text-sm text-muted-foreground">{t("restrictedBody")}</div>
      </div>
    );
  }

  const STAT_CELLS = [
    { key: "statClients", value: stats?.total_clients },
    { key: "statActiveSubs", value: stats?.active_subscriptions },
    { key: "statMrr", value: stats?.mrr_sar },
    { key: "statPastDue", value: stats?.past_due },
    { key: "statDocs", value: stats?.docs_analyzed },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-7 py-6 pb-10">
      <div className="mb-1 text-lg font-bold tracking-tight">{t("title")}</div>
      <div className="mb-[18px] text-[13px] text-muted-foreground">{t("subtitle")}</div>

      {/* stats */}
      <div className="mb-[18px] grid grid-cols-5 gap-3.5">
        {STAT_CELLS.map((s) => (
          <div key={s.key} className="rounded-[14px] border border-border bg-card p-[16px_18px]">
            <div className="text-[11.5px] font-medium text-muted-foreground">{t(s.key)}</div>
            <div className="font-mono-data mt-1.5 text-2xl font-bold">{loading ? "—" : s.value ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_420px] items-start gap-[18px]">
        {/* clients table */}
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-[18px] py-3">
            <Search className="size-4 text-muted-foreground" strokeWidth={1.8} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadClients(query)}
              placeholder={t("searchPlaceholder")}
              className="w-full bg-transparent text-[13px] outline-none"
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
              {t("loading")}
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-[12.5px] text-muted-foreground">{t("noClients")}</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/40 text-[10.5px] font-semibold uppercase text-muted-foreground">
                  <th className="px-[18px] py-2.5 text-start">{t("colClient")}</th>
                  <th className="px-2 py-2.5 text-start">{t("colPlan")}</th>
                  <th className="px-2 py-2.5 text-start">{t("colStatus")}</th>
                  <th className="px-2 py-2.5 text-start">{t("colMembers")}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openClient(c.id)}
                    data-active={c.id === selectedId}
                    className="cursor-pointer border-t border-border/60 transition-colors hover:bg-muted/30 data-[active=true]:bg-muted/40"
                  >
                    <td className="px-[18px] py-[11px]">
                      <div className="text-[12.5px] font-semibold">{c.name}</div>
                      <div className="font-mono-data text-[10.5px] text-muted-foreground">{c.jurisdiction}</div>
                    </td>
                    <td className="px-2 py-[11px] text-[12px]">{c.plan_name}</td>
                    <td className="px-2 py-[11px]"><StatusBadge status={c.subscription_status} /></td>
                    <td className="px-2 py-[11px] font-mono-data text-[12px] text-muted-foreground">{c.members}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* client detail */}
        <div className="rounded-[14px] border border-border bg-card p-5">
          {!selectedId ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-[12.5px] text-muted-foreground">
              <Users className="size-6" aria-hidden="true" />
              {t("selectClient")}
            </div>
          ) : detailLoading || !detail ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
              {t("loading")}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-base font-bold">{detail.name}</div>
                <div className="font-mono-data text-[11px] text-muted-foreground">{detail.id}</div>
              </div>

              {note && (
                <div
                  className={`flex items-center gap-2 rounded-[9px] border px-3 py-2 text-[12px] ${
                    note.ok ? "border-[#CDEBDC] bg-[#F4FAF7] text-accent" : "border-[#F8DADA] bg-[#FDF5F5] text-risk-high"
                  }`}
                >
                  {note.ok ? <CheckCircle2 className="size-3.5" strokeWidth={1.8} /> : <AlertTriangle className="size-3.5" strokeWidth={1.8} />}
                  {note.msg}
                </div>
              )}

              {/* subscription */}
              <div className="rounded-[11px] border border-border p-3.5">
                <div className="mb-2 flex items-center gap-2 text-[12.5px] font-bold">
                  <CreditCard className="size-[15px] text-primary" strokeWidth={1.8} />
                  {t("subscription")}
                </div>
                <div className="mb-2 flex items-center justify-between text-[12.5px]">
                  <span>{detail.subscription.plan_name}</span>
                  <StatusBadge status={detail.subscription.status} />
                </div>
                <div className="mb-3 text-[11.5px] text-muted-foreground">
                  {t("usage")}:{" "}
                  {detail.usage.limit === null
                    ? t("reviewsUnlimited", { used: detail.usage.used })
                    : t("reviewsUsed", { used: detail.usage.used, limit: detail.usage.limit })}
                </div>
                {detail.subscription.has_stripe_subscription ? (
                  <div className="flex flex-wrap gap-2">
                    <select
                      defaultValue={detail.subscription.plan || "starter"}
                      onChange={(e) => runAction(() => api.backoffice.changePlan(detail.id, e.target.value, tokenFn))}
                      disabled={busy}
                      className="h-[32px] rounded-[8px] border border-border bg-background px-2 text-[12px]"
                    >
                      {PLAN_OPTIONS.map((p) => (
                        <option key={p} value={p}>{t("changePlan")}: {p}</option>
                      ))}
                    </select>
                    {detail.subscription.status === "canceled" ? (
                      <button
                        onClick={() => runAction(() => api.backoffice.reactivate(detail.id, tokenFn))}
                        disabled={busy}
                        className="flex h-[32px] items-center gap-1.5 rounded-[8px] border border-border px-3 text-[12px] font-semibold hover:border-accent disabled:opacity-60"
                      >
                        <RefreshCcw className="size-[13px]" strokeWidth={1.8} /> {t("reactivate")}
                      </button>
                    ) : (
                      <button
                        onClick={() => window.confirm(t("confirmCancel")) && runAction(() => api.backoffice.cancel(detail.id, tokenFn))}
                        disabled={busy}
                        className="flex h-[32px] items-center gap-1.5 rounded-[8px] border border-[#F2D4D4] px-3 text-[12px] font-semibold text-risk-high hover:bg-risk-high-bg disabled:opacity-60"
                      >
                        <XCircle className="size-[13px]" strokeWidth={1.8} /> {t("cancel")}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-[11.5px] text-muted-foreground">{t("noStripeSub")}</div>
                )}
              </div>

              {/* payments */}
              <div className="rounded-[11px] border border-border p-3.5">
                <div className="mb-2 text-[12.5px] font-bold">{t("payments")}</div>
                {payments.length === 0 ? (
                  <div className="text-[11.5px] text-muted-foreground">{t("noPayments")}</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 rounded-[8px] bg-muted/30 px-2.5 py-2 text-[12px]">
                        <div>
                          <div className="font-mono-data">{p.amount_paid} {p.currency}</div>
                          <div className="text-[10.5px] text-muted-foreground">{p.number || p.id} · {p.status}</div>
                        </div>
                        {p.payment_intent && (
                          <button
                            onClick={() =>
                              window.confirm(t("confirmRefund")) &&
                              runAction(() => api.backoffice.refund(detail.id, { payment_intent: p.payment_intent! }, tokenFn))
                            }
                            disabled={busy}
                            className="rounded-[7px] border border-border px-2.5 py-1 text-[11px] font-semibold hover:border-risk-high hover:text-risk-high disabled:opacity-60"
                          >
                            {t("refund")}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* members */}
              <div className="rounded-[11px] border border-border p-3.5">
                <div className="mb-2 text-[12.5px] font-bold">{t("members")} ({detail.members.length})</div>
                <div className="flex flex-col gap-1.5">
                  {detail.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-[12px]">
                      <span>{m.email}</span>
                      <span className="font-mono-data text-[10.5px] text-muted-foreground">{m.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
