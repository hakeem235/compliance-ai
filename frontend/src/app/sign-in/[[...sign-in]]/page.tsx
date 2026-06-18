import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
      <span className="text-lg font-semibold text-foreground">ComplianceAI</span>
      <SignIn />
    </div>
  );
}
