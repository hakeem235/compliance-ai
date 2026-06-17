import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/compliance-calendar", label: "Compliance Calendar" },
  { href: "/assistant", label: "AI Assistant" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
  { href: "/admin", label: "Admin" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r p-4 space-y-1">
        <div className="px-2 pb-4 text-lg font-semibold">ComplianceAI</div>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {item.label}
          </Link>
        ))}
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
