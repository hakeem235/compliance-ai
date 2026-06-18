import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      <div
        className="relative hidden flex-1 flex-col overflow-hidden p-12 text-white md:flex"
        style={{ background: "#0B2E22" }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 20% 90%,rgba(52,211,153,0.16),transparent 55%)" }}
        />
        <div className="relative flex items-center gap-[11px]">
          <div
            className="flex size-[34px] items-center justify-center rounded-[9px]"
            style={{ background: "linear-gradient(150deg,#1F8A5B,#34D399)" }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" fill="#063124" />
              <path d="m8.5 12 2.4 2.4L16 9.3" stroke="#5BD6A0" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-base font-bold">
            Compliance<span className="text-[#5BD6A0]">AI</span>
          </div>
        </div>
        <div className="relative mt-auto">
          <div className="mb-4 text-[28px] font-bold leading-[1.2] tracking-tight">
            Compliance confidence,
            <br />
            built for the Kingdom.
          </div>
          <p className="max-w-[380px] text-sm leading-[1.6] text-white/65">
            Join SMEs, startups and legal teams using AI to review contracts and stay compliant with Saudi
            regulations.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white p-12">
        <SignIn />
      </div>
    </div>
  );
}
