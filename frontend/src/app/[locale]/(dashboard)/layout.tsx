import { UserButton } from "@clerk/nextjs";
import { Link } from "@/i18n/navigation";
import { Search, Bell, Globe } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "@/components/sidebar-nav";
import { TopbarTitle } from "@/components/topbar-title";
import { OrgSwitcher } from "@/components/org-switcher";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex h-screen w-[248px] flex-none flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground">
        <Link
          href="/"
          className="flex items-center gap-[11px] px-5 py-[18px] pt-[22px]"
        >
          <div
            className="flex size-[34px] flex-none items-center justify-center rounded-[9px]"
            style={{
              background: "linear-gradient(150deg,#1F8A5B,#34D399)",
              boxShadow: "0 2px 8px rgba(31,138,91,0.4)",
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" fill="#063124" />
              <path d="m8.5 12 2.4 2.4L16 9.3" stroke="#5BD6A0" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="leading-[1.05]">
            <div className="text-base font-bold tracking-tight">
              Compliance<span className="text-[#5BD6A0]">AI</span>
            </div>
            <div className="text-[10px] font-medium tracking-wide text-sidebar-foreground-muted">
              Legal &amp; Compliance
            </div>
          </div>
        </Link>

        {/* Org switcher */}
        <OrgSwitcher />

        {/* Nav */}
        <nav className="ca-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto px-3.5 py-2">
          <SidebarNav />
        </nav>

        {/* AI credits usage meter */}
        <div className="mx-3.5 mb-2.5 mt-2 rounded-xl border border-white/[0.07] bg-white/5 p-[13px]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-white/80">AI Review Credits</span>
            <span className="font-mono-data text-[11px] text-[#5BD6A0]">
              312<span className="text-white/35">/500</span>
            </span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: "62%", background: "linear-gradient(90deg,#1F8A5B,#34D399)" }}
            />
          </div>
          <Link
            href="/billing"
            className="mt-[11px] block w-full rounded-lg bg-[#5BD6A0]/[0.16] py-[7px] text-center text-[11.5px] font-semibold text-[#9FE6C4] transition-colors hover:bg-[#5BD6A0]/[0.26]"
          >
            Upgrade plan
          </Link>
        </div>
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
              placeholder="Search documents, clauses, regulations…"
              className="h-[38px] w-full rounded-[10px] border border-border bg-muted/60 ps-9 pe-3 text-[13px] outline-none transition-colors focus:border-accent focus:bg-card"
            />
          </div>
          <button
            title="Switch language"
            className="flex h-[38px] items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-[12.5px] font-semibold text-secondary-foreground transition-colors hover:border-accent"
          >
            <Globe className="size-[15px]" strokeWidth={1.8} />
            العربية
          </button>
          <button
            title="Notifications"
            className="relative flex size-[38px] items-center justify-center rounded-[10px] border border-border bg-card text-secondary-foreground transition-colors hover:border-accent"
          >
            <Bell className="size-[17px]" strokeWidth={1.8} />
            <span className="absolute end-2 top-[7px] size-[7px] rounded-full border-[1.5px] border-card bg-destructive" />
          </button>
          <div className="flex items-center gap-2.5 ps-1.5">
            <UserButton />
            <div className="leading-[1.15]">
              <div className="text-[12.5px] font-semibold">Faisal Al-Otaibi</div>
              <div className="text-[10.5px] text-muted-foreground">Business Owner</div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="ca-scroll min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
