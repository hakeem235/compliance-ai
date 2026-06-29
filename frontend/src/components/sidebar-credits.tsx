"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth";
import { Link } from "@/i18n/navigation";
import { api, type Usage } from "@/lib/api";

export function SidebarCredits() {
  const t = useTranslations("DashboardLayout");
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken(), [getToken]);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    api.usage
      .get(tokenFn)
      .then(setUsage)
      .catch(() => {
        /* non-fatal — the meter just stays in its loading state */
      });
  }, [tokenFn]);

  const unlimited = usage?.reviews_limit === null && usage !== null;
  const used = usage?.reviews_used ?? 0;
  const limit = usage?.reviews_limit ?? null;
  const pct =
    limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : unlimited ? 12 : 0;
  const overLimit = limit !== null && used > limit;

  return (
    <div className="mx-3.5 mb-2.5 mt-2 rounded-xl border border-white/[0.07] bg-white/5 p-[13px]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11.5px] font-semibold text-white/80">{t("aiCredits")}</span>
        <span className="font-mono-data text-[11px] text-[#5BD6A0]">
          {usage ? (
            <>
              {used}
              <span className="text-white/35">/{unlimited ? "∞" : limit}</span>
            </>
          ) : (
            <span className="text-white/35">…</span>
          )}
        </span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${pct}%`,
            background: overLimit
              ? "linear-gradient(90deg,#C0392B,#E74C3C)"
              : "linear-gradient(90deg,#1F8A5B,#34D399)",
          }}
        />
      </div>
      <Link
        href="/billing"
        className="mt-[11px] block w-full rounded-lg bg-[#5BD6A0]/[0.16] py-[7px] text-center text-[11.5px] font-semibold text-[#9FE6C4] transition-colors hover:bg-[#5BD6A0]/[0.26]"
      >
        {t("upgradePlan")}
      </Link>
    </div>
  );
}
