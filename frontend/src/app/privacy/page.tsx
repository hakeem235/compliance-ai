import Link from "next/link";

const SECTIONS = [
  {
    title: "1. Information we collect",
    body: "We collect account information (name, email, organization), documents you upload for review or generation, and usage data needed to operate the service (logs, device/browser metadata).",
  },
  {
    title: "2. How we use your information",
    body: "We use your data to provide contract review, document generation, compliance tracking and the AI assistant; to maintain and secure the platform; and to communicate with you about your account.",
  },
  {
    title: "3. AI processing",
    body: "Documents and questions you submit may be processed by third-party AI providers to generate analysis, drafts, or answers. AI output is informational only and does not constitute legal advice.",
  },
  {
    title: "4. Data storage and retention",
    body: "Your data is stored on infrastructure located in or accessible from Saudi Arabia and retained for as long as your account is active, or as required by applicable law, including the Personal Data Protection Law (PDPL).",
  },
  {
    title: "5. Data sharing",
    body: "We do not sell your data. We share data only with service providers that help us operate the platform (e.g. hosting, AI processing), under contractual confidentiality obligations, or when required by law.",
  },
  {
    title: "6. Your rights",
    body: "Under the PDPL, you may request access to, correction of, or deletion of your personal data, and may withdraw consent to processing where applicable. Contact us to exercise these rights.",
  },
  {
    title: "7. Security",
    body: "We apply industry-standard technical and organizational measures, including encryption in transit and access controls, to protect your data against unauthorized access, loss, or misuse.",
  },
  {
    title: "8. Contact",
    body: "For questions about this policy or to exercise your data rights, contact us at privacy@complianceai.sa.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-[#10201A]">
      <nav className="mx-auto flex h-[66px] max-w-[1200px] items-center gap-3.5 border-b border-[#EEF2F0] px-10">
        <Link href="/" className="flex items-center gap-3.5">
          <div
            className="flex size-8 items-center justify-center rounded-[9px]"
            style={{ background: "linear-gradient(150deg,#1F8A5B,#34D399)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" fill="#063124" />
              <path d="m8.5 12 2.4 2.4L16 9.3" stroke="#5BD6A0" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-base font-bold tracking-tight">
            Compliance<span className="text-accent">AI</span>
          </div>
        </Link>
        <div className="flex-1" />
        <Link href="/terms" className="text-[13px] font-medium text-[#5B6B66] hover:text-[#2A4A3E]">
          Terms
        </Link>
        <Link href="/" className="text-[13px] font-medium text-[#5B6B66] hover:text-[#2A4A3E]">
          Back to home
        </Link>
      </nav>

      <div className="mx-auto max-w-[760px] px-10 py-16">
        <h1 className="mb-2 text-[32px] font-bold tracking-tight">Privacy Policy</h1>
        <p className="mb-10 text-[13px] text-[#7C8B85]">Last updated: 18 June 2026</p>

        <div className="flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="mb-2 text-base font-bold">{s.title}</h2>
              <p className="text-[14px] leading-[1.7] text-[#3A4A44]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
