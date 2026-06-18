import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
      <span className="text-lg font-semibold text-foreground">ComplianceAI</span>
      <SignUp />
    </div>
  );
}
