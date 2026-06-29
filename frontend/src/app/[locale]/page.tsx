import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ShieldCheck, Sparkles, CalendarDays, MessagesSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { AiDisclaimer } from "@/components/citation-chip";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PricingPlans } from "@/components/pricing-plans";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";

const FEATURE_ICONS = [
  { key: "review", icon: ShieldCheck, bg: "bg-risk-low-bg", color: "var(--risk-low)" },
  { key: "generate", icon: Sparkles, bg: "bg-[#EEF3FF]", color: "#2A6FDB" },
  { key: "calendar", icon: CalendarDays, bg: "bg-risk-medium-bg", color: "var(--risk-medium)" },
  { key: "assistant", icon: MessagesSquare, bg: "bg-[#F3EEFF]", color: "#7C5CFF" },
] as const;

const CLIENTS = ["Najd Solutions", "Riyadh Capital Partners", "Khaleej Logistics", "Tabuk Health Group", "Dammam Retail Co."];

const RISK_ITEMS = [
  { color: "#FF8A8A", text: "Uncapped liability · §9.2", level: "High" },
  { color: "#F7C56E", text: "Missing PDPL clause", level: "Med" },
  { color: "#5BD6A0", text: "Governing law unset · §18", level: "Low" },
];

export default function LandingPage() {
  const t = useTranslations("Landing");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="mx-auto flex h-[66px] max-w-[1200px] items-center gap-3.5 border-b border-border px-10">
        <div className="relative size-8 flex-none overflow-hidden rounded-[9px] bg-white ring-1 ring-border">
          <Image src="/logo.jpg" alt="SaudiGRC logo" fill sizes="32px" className="object-cover" priority />
        </div>
        <div className="text-base font-bold tracking-tight">
          Saudi<span className="text-accent">GRC</span>
        </div>
        <div className="flex-1" />
        <a href="#product" className="cursor-pointer text-[13px] font-medium text-muted-foreground hover:text-foreground">
          {t("nav.product")}
        </a>
        <a href="#pricing" className="mx-1 cursor-pointer text-[13px] font-medium text-muted-foreground hover:text-foreground">
          {t("nav.pricing")}
        </a>
        <a href="#faq" className="mx-1 cursor-pointer text-[13px] font-medium text-muted-foreground hover:text-foreground">
          {t("nav.faq")}
        </a>
        <SignedIn>
          <Link
            href="/dashboard"
            className="flex h-[38px] items-center rounded-[9px] border border-border bg-card px-[18px] text-[13px] font-semibold text-secondary-foreground transition-colors hover:border-accent"
          >
            {t("nav.dashboard")}
          </Link>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton>
            <button className="flex h-[38px] items-center rounded-[9px] bg-primary px-[18px] text-[13px] font-semibold text-primary-foreground transition-colors hover:opacity-90">
              {t("nav.signIn")}
            </button>
          </SignInButton>
        </SignedOut>
        <LanguageSwitcher />
        <ThemeToggle />
      </nav>

      <div className="mx-auto grid max-w-[1100px] grid-cols-2 items-center gap-12 px-10 py-16 pb-10">
        <div>
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-risk-low-bg px-[13px] py-[5px] text-xs font-semibold text-primary">
            {t("hero.badge")}
          </div>
          <h1 className="mb-[18px] text-[46px] font-bold leading-[1.08] tracking-tight">
            {t("hero.titleLine1")}
            <br />
            <span className="text-accent">{t("hero.titleLine2")}</span>
          </h1>
          <p className="mb-7 max-w-[440px] text-base leading-[1.6] text-muted-foreground">{t("hero.subtitle")}</p>
          <div className="mb-[18px] flex gap-3">
            <SignedOut>
              <SignUpButton>
                <button className="h-12 rounded-[11px] bg-primary px-[26px] text-[14.5px] font-semibold text-primary-foreground transition-colors hover:opacity-90">
                  {t("hero.startTrial")}
                </button>
              </SignUpButton>
              <Link
                href="/dashboard"
                className="flex h-12 items-center gap-2 rounded-[11px] border border-border px-6 text-[14.5px] font-semibold text-secondary-foreground transition-colors hover:border-accent"
              >
                {t("hero.viewDemo")}
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="flex h-12 items-center rounded-[11px] bg-primary px-[26px] text-[14.5px] font-semibold text-primary-foreground transition-colors hover:opacity-90"
              >
                {t("hero.goToDashboard")}
              </Link>
            </SignedIn>
          </div>
          <div className="text-[12.5px] text-muted-foreground">{t("hero.trustedBy")}</div>
        </div>

        <div
          className="relative overflow-hidden rounded-[20px] p-[26px] text-white"
          style={{ background: "#0B2E22", boxShadow: "0 20px 50px rgba(11,46,34,0.3)" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 85% 5%,rgba(52,211,153,0.2),transparent 55%)" }}
          />
          <div className="relative">
            <div className="mb-[18px] flex items-center gap-4">
              <div className="relative size-24 flex-none">
                <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="#F5B544"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="251.3"
                    strokeDashoffset="95"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono-data text-[26px] font-bold">
                  62
                </div>
              </div>
              <div>
                <div className="text-[13px] text-white/60">{t("riskCard.orgRisk")}</div>
                <div className="mt-0.5 text-lg font-bold">{t("riskCard.moderateExposure")}</div>
                <div className="mt-1 text-xs text-[#9FE6C4]">{t("riskCard.flaggedClauses")}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {RISK_ITEMS.map((item) => (
                <div key={item.text} className="flex items-center gap-2.5 rounded-[10px] bg-white/[0.06] px-[13px] py-[11px]">
                  <span className="size-2 rounded-full" style={{ background: item.color }} />
                  <span className="flex-1 text-[12.5px]">{item.text}</span>
                  <span className="text-[11px] text-white/50">{item.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div id="product" className="border-t border-border px-10 py-[72px]">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-10 text-center">
            <h2 className="mb-2.5 text-[32px] font-bold tracking-tight">{t("product.heading")}</h2>
            <p className="text-[14.5px] text-muted-foreground">{t("product.subheading")}</p>
          </div>
          <div className="grid grid-cols-4 gap-[18px]">
            {FEATURE_ICONS.map((f) => (
              <div key={f.key}>
                <div className={`mb-3 flex size-10 items-center justify-center rounded-[11px] ${f.bg}`}>
                  <f.icon className="size-5" style={{ color: f.color }} strokeWidth={1.7} />
                </div>
                <div className="mb-1.5 text-sm font-bold">{t(`product.features.${f.key}.title`)}</div>
                <div className="text-[12.5px] leading-[1.5] text-muted-foreground">{t(`product.features.${f.key}.desc`)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="pricing" className="border-t border-border bg-muted/40 px-10 py-[72px]">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-10 text-center">
            <h2 className="mb-2.5 text-[32px] font-bold tracking-tight">{t("pricing.heading")}</h2>
            <p className="text-[14.5px] text-muted-foreground">{t("pricing.subheading")}</p>
          </div>
          <PricingPlans />
        </div>
      </div>

      <div className="border-t border-border px-10 py-10">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 text-center text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("clients.heading")}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {CLIENTS.map((name) => (
              <span key={name} className="text-[14px] font-semibold text-muted-foreground">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div id="faq" className="border-t border-border px-10 py-[72px]">
        <div className="mx-auto max-w-[760px]">
          <h2 className="mb-10 text-center text-[32px] font-bold tracking-tight">{t("faq.heading")}</h2>
          <div className="flex flex-col gap-3">
            {(t.raw("faq.items") as { q: string; a: string }[]).map((item) => (
              <details
                key={item.q}
                className="group rounded-[12px] border border-border px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-foreground">
                  {item.q}
                  <span className="text-[18px] text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border px-10 py-[22px]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between">
          <AiDisclaimer />
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
              {t("footer.terms")}
            </Link>
            <Link href="/privacy" className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
              {t("footer.privacy")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
