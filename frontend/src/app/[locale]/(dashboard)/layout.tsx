import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Search, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "@/components/sidebar-nav";
import { TopbarTitle } from "@/components/topbar-title";
import { OrgSwitcher } from "@/components/org-switcher";
import { LanguageToggleButton } from "@/components/language-toggle-button";
import { TopbarUser } from "@/components/topbar-user";
import { SidebarCredits } from "@/components/sidebar-credits";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("DashboardLayout");
  const tb = useTranslations("Brand");
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex h-screen w-[248px] flex-none flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground">
        <Link
          href="/"
          className="flex items-center gap-[11px] px-5 py-[18px] pt-[22px]"
        >
          <div
            className="relative size-[34px] flex-none overflow-hidden rounded-[9px] bg-white"
            style={{ boxShadow: "0 2px 8px rgba(31,138,91,0.4)" }}
          >
            <Image src="/logo.jpg" alt={`${tb("name")} logo`} fill sizes="34px" className="object-cover" priority />
          </div>
          <div className="leading-[1.05]">
            <div className="text-base font-bold tracking-tight">
              {tb("name")}
            </div>
            <div className="text-[10px] font-medium tracking-wide text-sidebar-foreground-muted">
              {t("brandSubtitle")}
            </div>
          </div>
        </Link>

        {/* Org switcher */}
        <OrgSwitcher />

        {/* Nav */}
        <nav className="ca-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto px-3.5 py-2">
          <SidebarNav />
        </nav>

        {/* AI review credits usage meter */}
        <SidebarCredits />
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-[62px] flex-none items-center gap-4 border-b border-border bg-card px-6">
          <TopbarTitle />
          <div className="flex-1" />
          <div className="relative w-[300px] max-w-[34vw]">
            <Search className="absolute inset-inline-start-3 top-1/2 size-4 -translate-y-1/2 opacity-40" />
            <input
              placeholder={t("searchPlaceholder")}
              className="h-[38px] w-full rounded-[10px] border border-border bg-muted/60 ps-9 pe-3 text-[13px] outline-none transition-colors focus:border-accent focus:bg-card"
            />
          </div>
          <LanguageToggleButton />
          <button
            title={t("notifications")}
            className="relative flex size-[38px] items-center justify-center rounded-[10px] border border-border bg-card text-secondary-foreground transition-colors hover:border-accent"
          >
            <Bell className="size-[17px]" strokeWidth={1.8} />
            <span className="absolute end-2 top-[7px] size-[7px] rounded-full border-[1.5px] border-card bg-destructive" />
          </button>
          <TopbarUser />
          <ThemeToggle />
        </header>

        <main className="ca-scroll min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
