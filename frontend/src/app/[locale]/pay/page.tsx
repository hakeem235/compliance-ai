"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const PK = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY || "";
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const MOYASAR_JS = "https://cdn.moyasar.com/mpf/1.15.0/moyasar.js";
const MOYASAR_CSS = "https://cdn.moyasar.com/mpf/1.15.0/moyasar.css";

type Plan = { key: string; name: string; price_sar: number | null };

export default function PayPage() {
  const params = useSearchParams();
  const planKey = params.get("plan") || "";
  const locale = useLocale();
  const tb = useTranslations("Brand");

  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inited = useRef(false);

  // Load the selected plan's price (public endpoint).
  useEffect(() => {
    fetch(`${API}/api/plans/`)
      .then((r) => r.json())
      .then((d: { plans: Plan[] }) => {
        const p = (d.plans || []).find((x) => x.key === planKey);
        if (!p || !p.price_sar) setError("Unknown or non-self-serve plan.");
        else setPlan(p);
      })
      .catch(() => setError("Could not load the plan."));
  }, [planKey]);

  // Inject Moyasar's CSS + JS, then mount the card form once the plan is known.
  useEffect(() => {
    if (!plan || !PK || inited.current) return;

    if (!document.querySelector(`link[href="${MOYASAR_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MOYASAR_CSS;
      document.head.appendChild(link);
    }

    function mount() {
      const M = (window as unknown as { Moyasar?: { init: (o: unknown) => void } }).Moyasar;
      if (!M || inited.current || !plan) return;
      inited.current = true;
      M.init({
        element: ".mysr-form",
        amount: (plan.price_sar as number) * 100, // SAR -> halalas
        currency: "SAR",
        description: `${plan.name} plan`,
        publishable_api_key: PK,
        // Moyasar appends ?id=&status=... ; we keep ?plan= so /billing can confirm.
        callback_url: `${window.location.origin}/${locale}/billing?plan=${planKey}`,
        methods: ["creditcard"],
      });
    }

    const existing = document.querySelector(`script[src="${MOYASAR_JS}"]`);
    if (existing) {
      mount();
    } else {
      const s = document.createElement("script");
      s.src = MOYASAR_JS;
      s.onload = mount;
      document.body.appendChild(s);
    }
  }, [plan, locale, planKey]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F4] p-6">
      <div className="w-full max-w-[460px] rounded-[16px] border border-border bg-white p-7 shadow-sm">
        <Link href="/billing" className="mb-5 flex items-center gap-2.5">
          <div className="relative size-8 overflow-hidden rounded-[9px] bg-white ring-1 ring-border">
            <Image src="/logo.jpg" alt={`${tb("name")} logo`} fill sizes="32px" className="object-cover" />
          </div>
          <span className="text-base font-bold tracking-tight">{tb("name")}</span>
        </Link>

        {error ? (
          <p className="rounded-[9px] border border-[#F8DADA] bg-[#FDF5F5] px-3 py-2.5 text-[13px] text-[#C0392B]">{error}</p>
        ) : !PK ? (
          <p className="rounded-[9px] border border-[#F8E3C2] bg-[#FFF8EC] px-3 py-2.5 text-[13px] text-[#8A5A00]">
            Payments are not configured: set NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY.
          </p>
        ) : (
          <>
            <h1 className="text-[20px] font-bold text-[#0B2E22]">
              {plan ? `Subscribe — ${plan.name}` : "Loading…"}
            </h1>
            {plan && (
              <p className="mb-4 mt-1 text-[13px] text-gray-500">
                SAR {plan.price_sar}/mo · test mode (use card 4111 1111 1111 1111, any future date, any CVC)
              </p>
            )}
            <div className="mysr-form" />
          </>
        )}
      </div>
    </div>
  );
}
