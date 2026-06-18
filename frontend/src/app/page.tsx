import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ShieldCheck, FileSearch, CalendarClock, MessagesSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { AiDisclaimer } from "@/components/citation-chip";

const PILLARS = [
  {
    icon: FileSearch,
    title: "Review",
    description: "Upload a contract and get clause-by-clause findings with a risk score in minutes, not days.",
  },
  {
    icon: CalendarClock,
    title: "Stay Compliant",
    description: "Track license renewals, contract expirations, and statutory deadlines in one calendar.",
  },
  {
    icon: MessagesSquare,
    title: "Ask",
    description: "Ask a question about Saudi labor or commercial law and get a cited, grounded answer.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-lg font-semibold">ComplianceAI</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <SignedIn>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}>
              Dashboard
            </Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <button className={buttonVariants({ variant: "ghost", className: "cursor-pointer" })}>Sign in</button>
            </SignInButton>
          </SignedOut>
        </div>
      </header>

      <section className="flex flex-col items-center gap-6 px-8 py-20 text-center">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-4 text-accent" />
          Built for Saudi PDPL &amp; Labor Law compliance
        </div>
        <h1 className="max-w-2xl text-5xl font-semibold tracking-tight">
          A calm, expert second opinion on every contract.
        </h1>
        <p className="max-w-xl text-muted-foreground">
          AI-powered contract review and compliance tracking for Saudi businesses, startups, and freelancers.
        </p>
        <SignedOut>
          <div className="flex gap-4">
            <SignUpButton>
              <button
                className={buttonVariants({
                  variant: "default",
                  className: "cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90",
                })}
              >
                Get started
              </button>
            </SignUpButton>
            <SignInButton>
              <button className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}>
                Sign in
              </button>
            </SignInButton>
          </div>
        </SignedOut>
        <SignedIn>
          <Link
            href="/dashboard"
            className={buttonVariants({
              variant: "default",
              className: "cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90",
            })}
          >
            Go to dashboard
          </Link>
        </SignedIn>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-8 pb-20 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <Card key={pillar.title}>
            <CardHeader>
              <pillar.icon className="mb-2 size-6 text-accent" aria-hidden="true" />
              <CardTitle>{pillar.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{pillar.description}</CardContent>
          </Card>
        ))}
      </section>

      <footer className="border-t border-border px-8 py-6 text-center">
        <AiDisclaimer />
      </footer>
    </main>
  );
}
