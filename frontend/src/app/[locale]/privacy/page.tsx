import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("Privacy");
  const sections = t.raw("sections") as { title: string; body: string }[];

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
          {t("nav.terms")}
        </Link>
        <Link href="/" className="text-[13px] font-medium text-[#5B6B66] hover:text-[#2A4A3E]">
          {t("nav.backToHome")}
        </Link>
      </nav>

      <div className="mx-auto max-w-[760px] px-10 py-16">
        <h1 className="mb-2 text-[32px] font-bold tracking-tight">{t("title")}</h1>
        <p className="mb-10 text-[13px] text-[#7C8B85]">{t("lastUpdated")}</p>

        <div className="flex flex-col gap-8">
          {sections.map((s) => (
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
