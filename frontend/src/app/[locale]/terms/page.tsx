import { Link } from "@/i18n/navigation";

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: "By accessing or using ComplianceAI, you agree to be bound by these Terms and Conditions. If you do not agree, do not use the service.",
  },
  {
    title: "2. Description of service",
    body: "ComplianceAI provides AI-assisted contract review, document generation, compliance deadline tracking and a legal assistant. The service is informational and does not constitute legal advice.",
  },
  {
    title: "3. Not legal advice",
    body: "AI-generated analysis, recommendations, drafts and chat responses are provided for informational purposes only. You should consult a licensed lawyer before relying on any output for a legal decision.",
  },
  {
    title: "4. Accounts and organizations",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your organization. You must provide accurate information when registering.",
  },
  {
    title: "5. Acceptable use",
    body: "You agree not to use the service to upload unlawful content, infringe third-party rights, attempt to reverse-engineer the platform, or interfere with its security or availability.",
  },
  {
    title: "6. Subscriptions and billing",
    body: "Paid plans are billed in advance on a recurring basis as described at checkout. You may cancel at any time; cancellation takes effect at the end of the current billing period.",
  },
  {
    title: "7. Intellectual property",
    body: "The platform, its design and underlying technology are owned by ComplianceAI. Documents you upload or generate remain your property; you grant us a limited license to process them to provide the service.",
  },
  {
    title: "8. Limitation of liability",
    body: "ComplianceAI is provided \"as is\" without warranties of any kind. To the maximum extent permitted by law, we are not liable for indirect, incidental or consequential damages arising from use of the service.",
  },
  {
    title: "9. Termination",
    body: "We may suspend or terminate access to the service for violation of these terms. You may stop using the service and close your account at any time.",
  },
  {
    title: "10. Governing law",
    body: "These terms are governed by the laws of the Kingdom of Saudi Arabia. Any dispute shall be subject to the exclusive jurisdiction of the competent Saudi courts.",
  },
  {
    title: "11. Changes to these terms",
    body: "We may update these terms from time to time. Continued use of the service after changes take effect constitutes acceptance of the revised terms.",
  },
  {
    title: "12. Contact",
    body: "For questions about these Terms and Conditions, contact us at legal@complianceai.sa.",
  },
];

export default function TermsPage() {
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
        <Link href="/privacy" className="text-[13px] font-medium text-[#5B6B66] hover:text-[#2A4A3E]">
          Privacy
        </Link>
        <Link href="/" className="text-[13px] font-medium text-[#5B6B66] hover:text-[#2A4A3E]">
          Back to home
        </Link>
      </nav>

      <div className="mx-auto max-w-[760px] px-10 py-16">
        <h1 className="mb-2 text-[32px] font-bold tracking-tight">Terms and Conditions</h1>
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
