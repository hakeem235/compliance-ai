"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, [string, string]> = {
  "/dashboard": ["Dashboard", "Faisal's compliance overview — Najd Solutions"],
  "/review": ["Documents", "Upload contracts for AI review"],
  "/generate": ["Document Generator", "Create compliant documents from a questionnaire"],
  "/stay-compliant": ["Compliance Calendar", "Deadlines, renewals & obligations"],
  "/ask": ["AI Legal Assistant", "Ask questions grounded in Saudi regulations"],
  "/billing": ["Billing & Plans", "Manage subscription and usage"],
  "/settings": ["Settings", "Profile, organization & security"],
  "/admin": ["Admin Panel", "Users, audit logs & knowledge base"],
};

export function TopbarTitle() {
  const pathname = usePathname() ?? "";
  const matchKey = Object.keys(TITLES).find(
    (key) => pathname === key || pathname.startsWith(`${key}/`)
  );
  const [title, subtitle] = matchKey
    ? TITLES[matchKey]
    : pathname.startsWith("/review/")
      ? ["Analysis Results", "AI contract review & risk assessment"]
      : ["SaudiGRC", ""];

  return (
    <div className="min-w-0">
      <div className="text-base font-bold leading-tight tracking-tight">{title}</div>
      {subtitle ? <div className="mt-px text-[11.5px] text-muted-foreground">{subtitle}</div> : null}
    </div>
  );
}
