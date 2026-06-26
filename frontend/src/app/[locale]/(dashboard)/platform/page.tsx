"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import {
  ShieldAlert, Loader2, Search, Users, CreditCard, RefreshCcw, XCircle, CheckCircle2,
  AlertTriangle, Download, Ban, ShieldCheck, Trash2, History, Gift,
} from "lucide-react";
import {
  api, apiDownload, ApiError,
  type PlatformStats, type ClientSummary, type ClientDetail, type ClientPayment,
  type AuditEntry, type PlatformAdminEntry,
} from "@/lib/api";

const PLAN_OPTIONS = ["starter", "growth", "enterprise"];
const ROLE_OPTIONS = ["owner", "admin", "member", "legal_reviewer"];
type Tab = "clients" | "activity" | "staff";

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
  const [tab, setTab] = useState<Tab>("clients");
  const [stats, setStats] = useState<PlatformStats | null>(null);

  // clients list + filters + pagination
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // detail
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [clientAudit, setClientAudit] = useState<AuditEntry[]>([]);
  const [notesDraft, setNotesDraft] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; msg: string } | null>(null);

  // activity + staff tabs
  const [platformAudit, setPlatformAudit] = useState<AuditEntry[]>([]);
  const [admins, setAdmins] = useState<PlatformAdminEntry[]>([]);
  const [newAdmin, setNewAdmin] = useState({ clerk_user_id: "", email: "" });

  const filters = useCallback(
    () => ({ q: query || undefined, plan: planFilter || undefined, status: statusFilter || undefined }),
    [query, planFilter, statusFilter]
  );

  const loadClients = useCallback(
    async (p = 1) => {
      try {
        const res = await api.backoffice.clients(tokenFn, { ...filters(), page: p, page_size: 25 });
        setClients(res.results);
        setTotal(res.total);
        setHasNext(res.has_next);
        setPage(res.page);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) setRestricted(true);
      }
    },
    [tokenFn, filters]
  );

  useEffect(() => {
    Promise.all([api.backoffice.stats(tokenFn), api.backoffice.clients(tokenFn, { page_size: 25 })])
      .then(([s, res]) => {
        setStats(s);
        setClients(res.results);
        setTotal(res.total);
        setHasNext(res.has_next);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) setRestricted(true);
      })
      .finally(() => setLoading(false));
  }, [tokenFn]);

  useEffect(() => {
    if (tab === "activity") api.backoffice.platformAudit(tokenFn).then(setPlatformAudit).catch(() => {});
    if (tab === "staff") api.backoffice.admins(tokenFn).then(setAdmins).catch(() => {});
  }, [tab, tokenFn]);

  async function openClient(id: string) {
    setSelectedId(id);
    setDetail(null);
    setPayments([]);
    setClientAudit([]);
    setNote(null);
    setDetailLoading(true);
    try {
      const d = await api.backoffice.client(id, tokenFn);
      setDetail(d);
      setNotesDraft(d.internal_notes);
      api.backoffice.payments(id, tokenFn).then(setPayments).catch(() => setPayments([]));
      api.backoffice.clientAudit(id, tokenFn).then(setClientAudit).catch(() => setClientAudit([]));
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
        api.backoffice.clientAudit(selectedId, tokenFn).then(setClientAudit).catch(() => {});
      }
      const [s] = await Promise.all([api.backoffice.stats(tokenFn), loadClients(page)]);
      setStats(s);
      setNote({ ok: true, msg: t("actionDone") });
    } catch (err) {
      setNote({ ok: false, msg: err instanceof ApiError ? err.message : t("actionFailed") });
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    apiDownload(api.backoffice.exportPath(filters()), tokenFn, "clients.csv").catch(() => {});
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
    { key: "statSuspended", value: stats?.suspended_clients },
    { key: "statComped", value: stats?.comped_clients },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-7 py-6 pb-10">
      <div className="mb-1 text-lg font-bold tracking-tight">{t("title")}</div>
      <div className="mb-[18px] text-[13px] text-muted-foreground">{t("subtitle")}</div>

      {/* stats */}
      <div className="mb-[18px] grid grid-cols-6 gap-3">
        {STAT_CELLS.map((s) => (
          <div key={s.key} className="rounded-[14px] border border-border bg-card p-[14px_16px]">
            <div className="text-[11px] font-medium text-muted-foreground">{t(s.key)}</div>
            <div className="font-mono-data mt-1.5 text-xl font-bold">{loading ? "—" : s.value ?? 0}</div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="mb-4 flex gap-1.5 border-b border-border">
        {(["clients", "activity", "staff"] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
              tab === tb ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(tb === "clients" ? "tabClients" : tb === "activity" ? "tabAudit" : "tabStaff")}
          </button>
        ))}
      </div>

      {tab === "clients" && (
        <div className="grid grid-cols-[1fr_430px] items-start gap-[18px]">
          {/* clients table */}
          <div className="overflow-hidden rounded-[14px] border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-[14px] py-2.5">
              <div className="flex flex-1 items-center gap-2">
                <Search className="size-4 text-muted-foreground" strokeWidth={1.8} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadClients(1)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full bg-transparent text-[13px] outline-none"
                />
              </div>
              <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); }} className="h-[30px] rounded-[7px] border border-border bg-background px-2 text-[12px]">
                <option value="">{t("filterPlan")}</option>
                <option value="free">free</option>
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); }} className="h-[30px] rounded-[7px] border border-border bg-background px-2 text-[12px]">
                <option value="">{t("filterStatus")}</option>
                {["active", "past_due", "canceled", "none", "suspended"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => loadClients(1)} className="h-[30px] rounded-[7px] bg-primary px-3 text-[12px] font-semibold text-primary-foreground">{t("colClient")}</button>
              <button onClick={exportCsv} title={t("export")} className="flex h-[30px] items-center gap-1.5 rounded-[7px] border border-border px-2.5 text-[12px] font-semibold hover:border-accent">
                <Download className="size-[13px]" strokeWidth={1.8} /> {t("export")}
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" strokeWidth={1.8} /> {t("loading")}
              </div>
            ) : clients.length === 0 ? (
              <div className="p-8 text-center text-[12.5px] text-muted-foreground">{t("noClients")}</div>
            ) : (
              <>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/40 text-[10.5px] font-semibold uppercase text-muted-foreground">
                      <th className="px-[14px] py-2.5 text-start">{t("colClient")}</th>
                      <th className="px-2 py-2.5 text-start">{t("colPlan")}</th>
                      <th className="px-2 py-2.5 text-start">{t("colStatus")}</th>
                      <th className="px-2 py-2.5 text-start">{t("colMembers")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr key={c.id} onClick={() => openClient(c.id)} data-active={c.id === selectedId}
                        className="cursor-pointer border-t border-border/60 transition-colors hover:bg-muted/30 data-[active=true]:bg-muted/40">
                        <td className="px-[14px] py-[10px]">
                          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                            {c.name}
                            {c.is_suspended && <span className="rounded bg-risk-high-bg px-1.5 text-[9px] font-bold uppercase text-risk-high">{t("suspended")}</span>}
                            {c.comped && <span className="rounded bg-risk-low-bg px-1.5 text-[9px] font-bold uppercase text-accent">{t("comped")}</span>}
                          </div>
                          <div className="font-mono-data text-[10.5px] text-muted-foreground">{c.jurisdiction}</div>
                        </td>
                        <td className="px-2 py-[10px] text-[12px]">{c.plan_name}</td>
                        <td className="px-2 py-[10px]"><StatusBadge status={c.subscription_status} /></td>
                        <td className="px-2 py-[10px] font-mono-data text-[12px] text-muted-foreground">{c.members}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-border px-[14px] py-2.5 text-[12px] text-muted-foreground">
                  <span>{total} · {t("pageOf", { page })}</span>
                  <div className="flex gap-1.5">
                    <button disabled={page <= 1} onClick={() => loadClients(page - 1)} className="rounded-[7px] border border-border px-2.5 py-1 disabled:opacity-40">{t("prev")}</button>
                    <button disabled={!hasNext} onClick={() => loadClients(page + 1)} className="rounded-[7px] border border-border px-2.5 py-1 disabled:opacity-40">{t("next")}</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* detail */}
          <div className="rounded-[14px] border border-border bg-card p-5">
            {!selectedId ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-[12.5px] text-muted-foreground">
                <Users className="size-6" aria-hidden="true" /> {t("selectClient")}
              </div>
            ) : detailLoading || !detail ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" strokeWidth={1.8} /> {t("loading")}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-base font-bold">
                      {detail.name}
                      {detail.is_suspended && <span className="rounded bg-risk-high-bg px-1.5 text-[10px] font-bold uppercase text-risk-high">{t("suspended")}</span>}
                    </div>
                    <div className="font-mono-data text-[11px] text-muted-foreground">{detail.id}</div>
                  </div>
                  <button
                    onClick={() => detail.is_suspended ? runAction(() => api.backoffice.suspend(detail.id, false, tokenFn)) : window.confirm(t("confirmSuspend")) && runAction(() => api.backoffice.suspend(detail.id, true, tokenFn))}
                    disabled={busy}
                    className={`flex h-[30px] items-center gap-1.5 rounded-[8px] border px-2.5 text-[12px] font-semibold disabled:opacity-60 ${detail.is_suspended ? "border-border hover:border-accent" : "border-[#F2D4D4] text-risk-high hover:bg-risk-high-bg"}`}
                  >
                    {detail.is_suspended ? <ShieldCheck className="size-[13px]" strokeWidth={1.8} /> : <Ban className="size-[13px]" strokeWidth={1.8} />}
                    {detail.is_suspended ? t("restore") : t("suspend")}
                  </button>
                </div>

                {note && (
                  <div className={`flex items-center gap-2 rounded-[9px] border px-3 py-2 text-[12px] ${note.ok ? "border-[#CDEBDC] bg-[#F4FAF7] text-accent" : "border-[#F8DADA] bg-[#FDF5F5] text-risk-high"}`}>
                    {note.ok ? <CheckCircle2 className="size-3.5" strokeWidth={1.8} /> : <AlertTriangle className="size-3.5" strokeWidth={1.8} />}
                    {note.msg}
                  </div>
                )}

                {/* subscription */}
                <div className="rounded-[11px] border border-border p-3.5">
                  <div className="mb-2 flex items-center gap-2 text-[12.5px] font-bold">
                    <CreditCard className="size-[15px] text-primary" strokeWidth={1.8} /> {t("subscription")}
                  </div>
                  <div className="mb-2 flex items-center justify-between text-[12.5px]">
                    <span>{detail.subscription.plan_name}{detail.subscription.comped && ` · ${t("comped")}`}</span>
                    <StatusBadge status={detail.subscription.status} />
                  </div>
                  <div className="mb-3 text-[11.5px] text-muted-foreground">
                    {t("usage")}: {detail.usage.limit === null ? t("reviewsUnlimited", { used: detail.usage.used }) : t("reviewsUsed", { used: detail.usage.used, limit: detail.usage.limit })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail.subscription.has_stripe_subscription && (
                      <>
                        <select defaultValue="" onChange={(e) => e.target.value && runAction(() => api.backoffice.changePlan(detail.id, e.target.value, tokenFn))} disabled={busy} className="h-[30px] rounded-[8px] border border-border bg-background px-2 text-[12px]">
                          <option value="">{t("changePlan")}…</option>
                          {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        {detail.subscription.status === "canceled" ? (
                          <button onClick={() => runAction(() => api.backoffice.reactivate(detail.id, tokenFn))} disabled={busy} className="flex h-[30px] items-center gap-1.5 rounded-[8px] border border-border px-3 text-[12px] font-semibold hover:border-accent disabled:opacity-60">
                            <RefreshCcw className="size-[13px]" strokeWidth={1.8} /> {t("reactivate")}
                          </button>
                        ) : (
                          <button onClick={() => window.confirm(t("confirmCancel")) && runAction(() => api.backoffice.cancel(detail.id, tokenFn))} disabled={busy} className="flex h-[30px] items-center gap-1.5 rounded-[8px] border border-[#F2D4D4] px-3 text-[12px] font-semibold text-risk-high hover:bg-risk-high-bg disabled:opacity-60">
                            <XCircle className="size-[13px]" strokeWidth={1.8} /> {t("cancel")}
                          </button>
                        )}
                      </>
                    )}
                    <select defaultValue="" onChange={(e) => e.target.value && runAction(() => api.backoffice.compPlan(detail.id, e.target.value, tokenFn))} disabled={busy} className="h-[30px] rounded-[8px] border border-border bg-background px-2 text-[12px]">
                      <option value="">{t("compPlan")}…</option>
                      {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
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
                            <button onClick={() => window.confirm(t("confirmRefund")) && runAction(() => api.backoffice.refund(detail.id, { payment_intent: p.payment_intent! }, tokenFn))} disabled={busy}
                              className="rounded-[7px] border border-border px-2.5 py-1 text-[11px] font-semibold hover:border-risk-high hover:text-risk-high disabled:opacity-60">{t("refund")}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* members */}
                <div className="rounded-[11px] border border-border p-3.5">
                  <div className="mb-2 text-[12.5px] font-bold">{t("members")} ({detail.members.length})</div>
                  <div className="flex flex-col gap-2">
                    {detail.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="min-w-0 flex-1 truncate">{m.email}</span>
                        <select defaultValue={m.role} onChange={(e) => runAction(() => api.backoffice.changeMemberRole(detail.id, m.id, e.target.value, tokenFn))} disabled={busy} className="h-[26px] rounded-[6px] border border-border bg-background px-1.5 text-[11px]">
                          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button onClick={() => window.confirm(t("confirmRemoveMember")) && runAction(() => api.backoffice.removeMember(detail.id, m.id, tokenFn))} disabled={busy} className="text-muted-foreground hover:text-risk-high disabled:opacity-60">
                          <Trash2 className="size-[14px]" strokeWidth={1.8} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* notes */}
                <div className="rounded-[11px] border border-border p-3.5">
                  <div className="mb-2 text-[12.5px] font-bold">{t("notes")}</div>
                  <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={3} placeholder={t("notesPlaceholder")}
                    className="w-full resize-y rounded-[8px] border border-border bg-background px-2.5 py-2 text-[12px] outline-none focus:border-accent" />
                  <button onClick={() => runAction(() => api.backoffice.saveNotes(detail.id, notesDraft, tokenFn))} disabled={busy}
                    className="mt-2 h-[30px] rounded-[8px] bg-primary px-3 text-[12px] font-semibold text-primary-foreground disabled:opacity-60">{t("saveNotes")}</button>
                </div>

                {/* client activity */}
                <div className="rounded-[11px] border border-border p-3.5">
                  <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold"><History className="size-[14px]" strokeWidth={1.8} /> {t("activityTitle")}</div>
                  {clientAudit.length === 0 ? (
                    <div className="text-[11.5px] text-muted-foreground">{t("noActivity")}</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {clientAudit.slice(0, 12).map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-[11.5px]">
                          <span className="font-mono-data">{l.action}</span>
                          <span className="text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          {platformAudit.length === 0 ? (
            <div className="p-8 text-center text-[12.5px] text-muted-foreground">{t("noActivity")}</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/40 text-[10.5px] font-semibold uppercase text-muted-foreground">
                  <th className="px-[18px] py-2.5 text-start">Action</th>
                  <th className="px-2 py-2.5 text-start">Actor</th>
                  <th className="px-2 py-2.5 text-start">Resource</th>
                  <th className="px-[18px] py-2.5 text-start">Time</th>
                </tr>
              </thead>
              <tbody>
                {platformAudit.map((l) => (
                  <tr key={l.id} className="border-t border-border/60">
                    <td className="px-[18px] py-[10px] font-mono-data text-[12px]">{l.action}</td>
                    <td className="px-2 py-[10px] text-[12px] text-secondary-foreground/80">{l.actor_name || "—"}</td>
                    <td className="px-2 py-[10px] text-[11.5px] text-muted-foreground">{l.resource_type}</td>
                    <td className="px-[18px] py-[10px] font-mono-data text-[11.5px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "staff" && (
        <div className="max-w-[680px] rounded-[14px] border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-[16px] text-primary" strokeWidth={1.8} /> {t("staffTitle")}</div>
          <div className="mb-4 flex flex-wrap gap-2">
            <input value={newAdmin.clerk_user_id} onChange={(e) => setNewAdmin((a) => ({ ...a, clerk_user_id: e.target.value }))} placeholder={t("clerkIdPlaceholder")} className="h-[32px] flex-1 rounded-[8px] border border-border bg-background px-2.5 text-[12px]" />
            <input value={newAdmin.email} onChange={(e) => setNewAdmin((a) => ({ ...a, email: e.target.value }))} placeholder={t("emailPlaceholder")} className="h-[32px] w-[180px] rounded-[8px] border border-border bg-background px-2.5 text-[12px]" />
            <button
              onClick={async () => {
                if (!newAdmin.clerk_user_id.trim()) return;
                try {
                  await api.backoffice.addAdmin(newAdmin, tokenFn);
                  setNewAdmin({ clerk_user_id: "", email: "" });
                  setAdmins(await api.backoffice.admins(tokenFn));
                } catch {/* ignore */}
              }}
              className="flex h-[32px] items-center gap-1.5 rounded-[8px] bg-primary px-3 text-[12px] font-semibold text-primary-foreground"
            >
              <Gift className="size-[13px]" strokeWidth={1.8} /> {t("add")}
            </button>
          </div>
          <div className="flex flex-col divide-y divide-border/60">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 text-[12.5px]">
                <div>
                  <div className="font-semibold">{a.email || a.clerk_user_id}</div>
                  <div className="font-mono-data text-[10.5px] text-muted-foreground">{a.clerk_user_id}</div>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm(t("confirmRemoveStaff"))) return;
                    try { await api.backoffice.removeAdmin(a.id, tokenFn); setAdmins(await api.backoffice.admins(tokenFn)); } catch {/* ignore */}
                  }}
                  className="text-muted-foreground hover:text-risk-high"
                >
                  <Trash2 className="size-[15px]" strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
