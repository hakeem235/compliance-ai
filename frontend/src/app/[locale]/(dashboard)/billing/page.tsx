import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";

const USAGE_KEYS = [
  { key: "aiReviews", used: 312, total: 500 },
  { key: "generatedDocuments", used: 48, total: 100 },
  { key: "teamSeats", used: 6, total: 10 },
] as const;

const CURRENT_PLAN_NAME = "Growth";

const INVOICES = [
  { id: "INV-2026-006", date: "1 Jun 2026", amount: "SAR 749.00" },
  { id: "INV-2026-005", date: "1 May 2026", amount: "SAR 749.00" },
  { id: "INV-2026-004", date: "1 Apr 2026", amount: "SAR 749.00" },
];

export default function BillingPage() {
  const t = useTranslations("Billing");

  const BILLING_PLANS = PLANS.map((plan) => ({
    ...plan,
    current: plan.name === CURRENT_PLAN_NAME,
    cta: plan.name === CURRENT_PLAN_NAME ? t("yourPlan") : plan.name === "Enterprise" ? t("contactSales") : t("downgrade"),
  }));

  return (
    <div className="mx-auto max-w-[1080px] px-7 py-6 pb-10">
      {/* current plan + usage */}
      <div className="mb-[18px] grid grid-cols-2 gap-[18px]">
        <div className="relative overflow-hidden rounded-2xl bg-sidebar p-[22px] text-sidebar-foreground">
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 90% 10%,rgba(52,211,153,0.16),transparent 55%)" }}
          />
          <div className="relative">
            <div className="text-xs font-semibold text-sidebar-foreground-muted">{t("currentPlan")}</div>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <div className="text-[26px] font-bold">Growth</div>
              <div className="font-mono-data text-[13px] text-[#9FE6C4]">SAR 749/mo</div>
            </div>
            <div className="mt-1 text-xs text-sidebar-foreground-muted">{t("renews")}</div>
            <div className="mt-4 flex gap-2">
              <button className="h-9 rounded-[9px] bg-[#5BD6A0] px-4 text-[12.5px] font-bold text-[#06281D] transition-colors hover:bg-[#7CE3B6]">
                {t("upgrade")}
              </button>
              <button className="h-9 rounded-[9px] border border-white/20 px-4 text-[12.5px] font-semibold text-white">
                {t("manage")}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-[22px]">
          <div className="mb-[15px] text-[13px] font-bold">{t("usageThisCycle")}</div>
          <div className="flex flex-col gap-3.5">
            {USAGE_KEYS.map((u) => (
              <div key={u.key}>
                <div className="mb-[5px] flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">{t(`usage.${u.key}`)}</span>
                  <span className="font-mono-data font-semibold">
                    {u.used} / {u.total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(u.used / u.total) * 100}%`, background: "linear-gradient(90deg,#1F8A5B,#34D399)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* plans */}
      <div className="mb-3.5 text-sm font-bold">{t("plans")}</div>
      <div className="mb-6 grid grid-cols-3 gap-3.5">
        {BILLING_PLANS.map((plan) => (
          <div
            key={plan.name}
            className="relative rounded-[14px] border bg-card p-5"
            style={plan.current ? { borderWidth: 2, borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}
          >
            {plan.current && (
              <span className="absolute -top-2.5 start-5 rounded-full bg-accent px-2.5 py-[3px] text-[10px] font-bold text-accent-foreground">
                {t("current")}
              </span>
            )}
            <div className="text-sm font-bold">{plan.name}</div>
            <div className="font-mono-data my-2 text-2xl font-bold">
              {plan.price}
              {plan.price !== "Custom" && <span className="text-[13px] text-muted-foreground">{t("perMonth")}</span>}
            </div>
            <div className="mb-3.5 text-[11.5px] text-muted-foreground">{plan.blurb}</div>
            <div className="flex flex-col gap-2 text-xs text-secondary-foreground/80">
              {plan.features.map((f) => (
                <div key={f} className="flex gap-2">
                  <Check className="size-3.5 flex-none text-accent" strokeWidth={2.2} />
                  {f}
                </div>
              ))}
            </div>
            <button
              disabled={plan.current}
              className={
                plan.current
                  ? "mt-4 w-full cursor-default rounded-[9px] bg-risk-low-bg py-2.5 text-[12.5px] font-bold text-accent"
                  : plan.name === "Enterprise"
                    ? "mt-4 w-full rounded-[9px] bg-primary py-2.5 text-[12.5px] font-bold text-primary-foreground transition-colors hover:bg-[#0E4A38]"
                    : "mt-4 w-full rounded-[9px] border border-border bg-card py-2.5 text-[12.5px] font-semibold text-secondary-foreground"
              }
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* payment + invoices */}
      <div className="grid grid-cols-[300px_1fr] gap-[18px]">
        <div className="rounded-[14px] border border-border bg-card p-[18px]">
          <div className="mb-3.5 text-[13px] font-bold">{t("paymentMethod")}</div>
          <div className="flex items-center gap-3 rounded-[11px] border border-border p-[13px]">
            <div
              className="flex h-7 w-[42px] flex-none items-center justify-center rounded-[5px] text-[9px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#0B3D2E,#1F8A5B)" }}
            >
              mada
            </div>
            <div className="flex-1">
              <div className="font-mono-data text-[12.5px] font-semibold">•••• 4821</div>
              <div className="text-[11px] text-muted-foreground">{t("expires")}</div>
            </div>
          </div>
          <button className="mt-[11px] h-9 w-full rounded-[9px] border border-border bg-card text-xs font-semibold text-secondary-foreground">
            {t("updateCard")}
          </button>
        </div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="border-b border-border px-[18px] py-3.5 text-[13px] font-bold">{t("invoices")}</div>
          <table className="w-full border-collapse">
            <tbody>
              {INVOICES.map((inv, i) => (
                <tr key={inv.id} className={i > 0 ? "border-t border-border/60" : ""}>
                  <td className="px-[18px] py-[11px] text-[12.5px] font-semibold">{inv.id}</td>
                  <td className="font-mono-data px-2 py-[11px] text-xs text-muted-foreground">{inv.date}</td>
                  <td className="font-mono-data px-2 py-[11px] text-[12.5px]">{inv.amount}</td>
                  <td className="px-2 py-[11px]">
                    <span className="rounded-full bg-risk-low-bg px-2.5 py-0.5 text-[10.5px] font-semibold text-accent">
                      {t("paid")}
                    </span>
                  </td>
                  <td className="px-[18px] py-[11px] text-end">
                    <a className="cursor-pointer text-xs font-semibold text-accent">{t("pdf")}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
