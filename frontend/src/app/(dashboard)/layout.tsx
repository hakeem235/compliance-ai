import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { FileSearch, CalendarClock, MessagesSquare, Settings, CreditCard, ShieldCheck, MoreHorizontal } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";

const PILLARS = [
  {
    href: "/review",
    label: "Review",
    description: "Documents & contract analysis",
    icon: FileSearch,
  },
  {
    href: "/stay-compliant",
    label: "Stay Compliant",
    description: "Calendar & obligations",
    icon: CalendarClock,
  },
  {
    href: "/ask",
    label: "Ask",
    description: "AI legal assistant",
    icon: MessagesSquare,
  },
];

const UTILITY = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="px-2 py-1 text-lg font-semibold">
            ComplianceAI
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {PILLARS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      tooltip={item.description}
                      size="lg"
                    >
                      <item.icon />
                      <div className="flex flex-col gap-0.5 leading-tight">
                        <span>{item.label}</span>
                        <span className="text-xs text-sidebar-foreground/60">{item.description}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <span>More</span>
                  <MoreHorizontal className="size-4" />
                </button>
              }
            />
            <DropdownMenuContent align="start" side="top">
              {UTILITY.map((item) => (
                <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
                  <item.icon className="size-4" />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2 px-2 py-1">
            <UserButton />
            <span className="text-sm text-sidebar-foreground/70">Account</span>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-2 border-b px-4">
          <SidebarTrigger />
          <ThemeToggle />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
