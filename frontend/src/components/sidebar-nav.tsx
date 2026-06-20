"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutGrid,
  FileText,
  Sparkles,
  CalendarDays,
  MessagesSquare,
  CreditCard,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; labelKey: string; icon: typeof LayoutGrid };

const WORK_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutGrid },
  { href: "/review", labelKey: "documentsReviews", icon: FileText },
  { href: "/generate", labelKey: "generate", icon: Sparkles },
  { href: "/stay-compliant", labelKey: "calendar", icon: CalendarDays },
  { href: "/ask", labelKey: "aiAssistant", icon: MessagesSquare },
];

const MANAGE_NAV: NavItem[] = [
  { href: "/billing", labelKey: "billing", icon: CreditCard },
  { href: "/settings", labelKey: "settings", icon: SettingsIcon },
  { href: "/admin", labelKey: "admin", icon: Users },
];

function NavLink({ item }: { item: NavItem }) {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      data-active={active}
      className={cn(
        "flex w-full items-center gap-[11px] rounded-[9px] px-[11px] py-[9px] text-[13.5px] font-medium text-sidebar-foreground-muted transition-colors hover:bg-white/[0.07]",
        active && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <Icon className="size-[18px] flex-none" strokeWidth={1.8} />
      {t(item.labelKey)}
    </Link>
  );
}

/** Renders the full WORKSPACE + MANAGE nav sections. Rendering (incl. the .map calls)
 * must happen entirely inside this client component — a server component cannot call
 * .map() on an array exported from a "use client" module, and a component reference
 * (icon) cannot be passed as a prop across the server→client boundary. */
export function SidebarNav() {
  const t = useTranslations("Sidebar");
  return (
    <>
      <div className="px-2.5 py-[10px] pb-[5px] text-[10px] font-semibold tracking-[0.08em] text-white/30">
        {t("workspace")}
      </div>
      {WORK_NAV.map((item) => (
        <NavLink key={item.href} item={item} />
      ))}

      <div className="px-2.5 pt-3.5 pb-[5px] text-[10px] font-semibold tracking-[0.08em] text-white/30">
        {t("manage")}
      </div>
      {MANAGE_NAV.map((item) => (
        <NavLink key={item.href} item={item} />
      ))}
    </>
  );
}
