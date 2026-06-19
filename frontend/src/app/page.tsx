import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ShieldCheck, Sparkles, CalendarDays, MessagesSquare, Check } from "lucide-react";
import { AiDisclaimer } from "@/components/citation-chip";
import { PLANS } from "@/lib/plans";

const FEATURES = [
  {
    icon: ShieldCheck,
    bg: "bg-risk-low-bg",
    color: "var(--risk-low)",
    title: "AI contract review",
    desc: "Risk score, clause-by-clause findings and fixes in seconds.",
  },
  {
    icon: Sparkles,
    bg: "bg-[#EEF3FF]",
    color: "#2A6FDB",
    title: "Document generator",
    desc: "Draft NDAs, contracts & letters from a short questionnaire.",
  },
  {
    icon: CalendarDays,
    bg: "bg-risk-medium-bg",
    color: "var(--risk-medium)",
    title: "Compliance calendar",
    desc: "Never miss a license renewal, GOSI or tax deadline.",
  },
  {
    icon: MessagesSquare,
    bg: "bg-[#F3EEFF]",
    color: "#7C5CFF",
    title: "AI legal assistant",
    desc: "Ask anything — answers cite the exact Saudi regulation.",
  },
];

const CLIENTS = ["Najd Solutions", "Riyadh Capital Partners", "Khaleej Logistics", "Tabuk Health Group", "Dammam Retail Co."];

const RISK_ITEMS = [
  { color: "#FF8A8A", text: "Uncapped liability · §9.2", level: "High" },
  { color: "#F7C56E", text: "Missing PDPL clause", level: "Med" },
  { color: "#5BD6A0", text: "Governing law unset · §18", level: "Low" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-[#10201A]">
      <nav className="mx-auto flex h-[66px] max-w-[1200px] items-center gap-3.5 border-b border-[#EEF2F0] px-10">
        <div
          className="flex size-8 items-center justify-center rounded-[9px]"
          style={{ background: "linear-gradient(150deg,#1F8A5B,#34D399)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" fill="#063124" />
            <path d="m8.5 12 2.4 2.4L16 9.3" stroke="#5BD6A0" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-base font-bold tracking-tight">
          Compliance<span className="text-accent">AI</span>
        </div>
        <div className="flex-1" />
        <a href="#product" className="cursor-pointer text-[13px] font-medium text-[#5B6B66] hover:text-[#2A4A3E]">
          Product
        </a>
        <a href="#pricing" className="mx-1 cursor-pointer text-[13px] font-medium text-[#5B6B66] hover:text-[#2A4A3E]">
          Pricing
        </a>
        <SignedIn>
          <Link
            href="/dashboard"
            className="flex h-[38px] items-center rounded-[9px] border border-[#E2E9E6] bg-white px-[18px] text-[13px] font-semibold text-[#2A4A3E] transition-colors hover:border-accent"
          >
            Dashboard
          </Link>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton>
            <button className="flex h-[38px] items-center rounded-[9px] bg-primary px-[18px] text-[13px] font-semibold text-white transition-colors hover:bg-[#0E4A38]">
              Sign in
            </button>
          </SignInButton>
        </SignedOut>
      </nav>

      <div className="mx-auto grid max-w-[1100px] grid-cols-2 items-center gap-12 px-10 py-16 pb-10">
        <div>
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-risk-low-bg px-[13px] py-[5px] text-xs font-semibold text-primary">
            🇸🇦 Built for Saudi Arabia · PDPL ready
          </div>
          <h1 className="mb-[18px] text-[46px] font-bold leading-[1.08] tracking-tight">
            Legal &amp; compliance,
            <br />
            <span className="text-accent">powered by AI.</span>
          </h1>
          <p className="mb-7 max-w-[440px] text-base leading-[1.6] text-[#5B6B66]">
            Review contracts, catch legal risks, track compliance deadlines and generate documents — grounded in
            Saudi regulations, with a citation for every recommendation.
          </p>
          <div className="mb-[18px] flex gap-3">
            <SignedOut>
              <SignUpButton>
                <button className="h-12 rounded-[11px] bg-primary px-[26px] text-[14.5px] font-semibold text-white transition-colors hover:bg-[#0E4A38]">
                  Start free trial
                </button>
              </SignUpButton>
              <Link
                href="/dashboard"
                className="flex h-12 items-center gap-2 rounded-[11px] border border-[#E2E9E6] px-6 text-[14.5px] font-semibold text-[#2A4A3E] transition-colors hover:border-accent"
              >
                View live demo →
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="flex h-12 items-center rounded-[11px] bg-primary px-[26px] text-[14.5px] font-semibold text-white transition-colors hover:bg-[#0E4A38]"
              >
                Go to dashboard
              </Link>
            </SignedIn>
          </div>
          <div className="text-[12.5px] text-[#9AA8A2]">Trusted by SMEs, startups &amp; legal teams across the Kingdom</div>
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
                <div className="text-[13px] text-white/60">Organization Risk</div>
                <div className="mt-0.5 text-lg font-bold">Moderate exposure</div>
                <div className="mt-1 text-xs text-[#9FE6C4]">7 high-risk clauses flagged</div>
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

      <div id="product" className="border-t border-[#EEF2F0] px-10 py-[72px]">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-10 text-center">
            <h2 className="mb-2.5 text-[32px] font-bold tracking-tight">Everything your legal workflow needs</h2>
            <p className="text-[14.5px] text-[#7C8B85]">One platform for review, generation, deadlines and questions.</p>
          </div>
          <div className="grid grid-cols-4 gap-[18px]">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <div className={`mb-3 flex size-10 items-center justify-center rounded-[11px] ${f.bg}`}>
                  <f.icon className="size-5" style={{ color: f.color }} strokeWidth={1.7} />
                </div>
                <div className="mb-1.5 text-sm font-bold">{f.title}</div>
                <div className="text-[12.5px] leading-[1.5] text-[#7C8B85]">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="pricing" className="border-t border-[#EEF2F0] bg-[#FAFBFB] px-10 py-[72px]">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-10 text-center">
            <h2 className="mb-2.5 text-[32px] font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="text-[14.5px] text-[#7C8B85]">Cancel anytime. Prices in Saudi riyals, billed monthly.</p>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="relative rounded-[16px] border bg-white p-7"
                style={plan.name === "Growth" ? { borderWidth: 2, borderColor: "var(--accent)" } : { borderColor: "#E8EDEB" }}
              >
                {plan.name === "Growth" && (
                  <span className="absolute -top-3 start-7 rounded-full bg-accent px-3 py-1 text-[10.5px] font-bold text-accent-foreground">
                    MOST POPULAR
                  </span>
                )}
                <div className="text-sm font-bold">{plan.name}</div>
                <div className="font-mono-data my-2.5 text-[30px] font-bold">
                  {plan.price}
                  {plan.price !== "Custom" && <span className="text-sm text-[#7C8B85]">/mo</span>}
                </div>
                <div className="mb-5 text-[12.5px] text-[#7C8B85]">{plan.blurb}</div>
                <div className="mb-6 flex flex-col gap-2.5 text-[13px] text-[#3A4A44]">
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
                        plan.name === "Growth"
                          ? "w-full rounded-[10px] bg-primary py-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#0E4A38]"
                          : "w-full rounded-[10px] border border-[#E2E9E6] bg-white py-3 text-[13.5px] font-semibold text-[#2A4A3E] transition-colors hover:border-accent"
                      }
                    >
                      {plan.name === "Enterprise" ? "Contact sales" : "Start free trial"}
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/billing"
                    className={
                      plan.name === "Growth"
                        ? "flex w-full items-center justify-center rounded-[10px] bg-primary py-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#0E4A38]"
                        : "flex w-full items-center justify-center rounded-[10px] border border-[#E2E9E6] bg-white py-3 text-[13.5px] font-semibold text-[#2A4A3E] transition-colors hover:border-accent"
                    }
                  >
                    {plan.name === "Enterprise" ? "Contact sales" : "Manage plan"}
                  </Link>
                </SignedIn>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[#EEF2F0] px-10 py-10">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 text-center text-[12px] font-semibold uppercase tracking-wide text-[#9AA8A2]">
            Trusted by teams across the Kingdom
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {CLIENTS.map((name) => (
              <span key={name} className="text-[14px] font-semibold text-[#B8C2BE]">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[#EEF2F0] px-10 py-[22px]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between">
          <AiDisclaimer />
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-[12.5px] font-medium text-[#7C8B85] hover:text-[#2A4A3E]">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="text-[12.5px] font-medium text-[#7C8B85] hover:text-[#2A4A3E]">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
