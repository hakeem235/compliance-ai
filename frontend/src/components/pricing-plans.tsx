"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PLANS } from "@/lib/plans";
import { api, type PlanCatalogItem } from "@/lib/api";

export function PricingPlans() {
  const t = useTranslations("Landing");
  const [catalog, setCatalog] = useState<PlanCatalogItem[] | null>(null);

  useEffect(() => {
    api.plans
      .list()
      .then((res) => setCatalog(res.plans))
      .catch(() => {
        /* public endpoint; on failure fall back to bundled prices */
      });
  }, []);

  // Real price from the backend catalog (the same source the billing page +
  // Stripe use); falls back to the bundled copy if the fetch hasn't resolved.
  function priceFor(planName: string, fallback: string): string {
    const match = catalog?.find((p) => p.key === planName.toLowerCase());
    if (!match) return fallback;
    return match.price_sar === null ? "Custom" : `SAR ${match.price_sar}`;
  }

  return (
    <div className="grid grid-cols-3 gap-5">
      {PLANS.map((plan) => {
        const isGrowth = plan.name === "Growth";
        const isEnterprise = plan.name === "Enterprise";
        const price = priceFor(plan.name, plan.price);
        return (
          <div
            key={plan.name}
            className="relative rounded-[16px] border bg-card p-7"
            style={isGrowth ? { borderWidth: 2, borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}
          >
            {isGrowth && (
              <span className="absolute -top-3 start-7 rounded-full bg-accent px-3 py-1 text-[10.5px] font-bold text-accent-foreground">
                {t("pricing.mostPopular")}
              </span>
            )}
            <div className="text-sm font-bold">{plan.name}</div>
            <div className="font-mono-data my-2.5 text-[30px] font-bold">
              {price}
              {price !== "Custom" && <span className="text-sm text-muted-foreground">/mo</span>}
            </div>
            <div className="mb-5 text-[12.5px] text-muted-foreground">{plan.blurb}</div>
            <div className="mb-6 flex flex-col gap-2.5 text-[13px] text-foreground">
              {plan.features.map((f) => (
                <div key={f} className="flex gap-2.5">
                  <Check className="size-4 flex-none text-accent" strokeWidth={2.2} />
                  {f}
                </div>
              ))}
            </div>
            <SignedOut>
              <SignUpButton>
                <button
                  className={
                    isGrowth
                      ? "w-full rounded-[10px] bg-primary py-3 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:opacity-90"
                      : "w-full rounded-[10px] border border-border bg-card py-3 text-[13.5px] font-semibold text-secondary-foreground transition-colors hover:border-accent"
                  }
                >
                  {isEnterprise ? t("pricing.contactSales") : t("pricing.startTrial")}
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/billing"
                className={
                  isGrowth
                    ? "flex w-full items-center justify-center rounded-[10px] bg-primary py-3 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:opacity-90"
                    : "flex w-full items-center justify-center rounded-[10px] border border-border bg-card py-3 text-[13.5px] font-semibold text-secondary-foreground transition-colors hover:border-accent"
                }
              >
                {isEnterprise ? t("pricing.contactSales") : t("pricing.managePlan")}
              </Link>
            </SignedIn>
          </div>
        );
      })}
    </div>
  );
}
