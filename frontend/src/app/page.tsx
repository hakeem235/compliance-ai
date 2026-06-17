import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">ComplianceAI</h1>
      <p className="max-w-xl text-muted-foreground">
        AI-powered contract review and compliance tracking for Saudi businesses, startups, and freelancers.
      </p>
      <div className="flex gap-4">
        <Link href="/sign-up" className={buttonVariants({ variant: "default" })}>
          Get started
        </Link>
        <Link href="/sign-in" className={buttonVariants({ variant: "outline" })}>
          Sign in
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        ComplianceAI provides AI-assisted guidance and does not constitute legal advice.
      </p>
    </main>
  );
}
