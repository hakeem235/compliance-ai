"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useAuth, AuthError } from "@/components/auth";
import { Link, useRouter } from "@/i18n/navigation";

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const tb = useTranslations("Brand");
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ email, password, name, organizationName });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  const field = "mt-1.5 h-[42px] w-full rounded-[9px] border border-gray-300 px-3 text-[14px] text-gray-900 outline-none focus:border-[#1F8A5B]";
  const label = "mt-4 block text-[12.5px] font-semibold text-gray-700";

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
        <Link href="/" className="relative flex items-center gap-[11px]">
          <div className="relative size-[34px] overflow-hidden rounded-[9px] bg-white">
            <Image src="/logo.jpg" alt={`${tb("name")} logo`} fill sizes="34px" className="object-cover" />
          </div>
          <div className="text-base font-bold">{tb("name")}</div>
        </Link>
        <div className="relative mt-auto">
          <div className="mb-4 text-[28px] font-bold leading-[1.2] tracking-tight">{t("marketingTitle")}</div>
          <p className="max-w-[380px] text-sm leading-[1.6] text-white/65">{t("marketingBody")}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-12">
        <form onSubmit={onSubmit} className="w-full max-w-[400px]">
          <h1 className="text-[24px] font-bold tracking-tight text-[#0B2E22]">{t("signUpTitle")}</h1>
          <p className="mt-1 text-[13px] text-gray-500">{t("signUpSubtitle")}</p>

          {error ? (
            <div className="mt-5 rounded-[9px] border border-[#F8DADA] bg-[#FDF5F5] px-3 py-2.5 text-[12.5px] text-[#C0392B]">
              {error}
            </div>
          ) : null}

          <label className={label.replace("mt-4", "mt-5")}>{t("fullName")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Your name" />

          <label className={label}>{t("organizationName")}</label>
          <input
            required
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className={field}
            placeholder="Your company"
          />

          <label className={label}>{t("email")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            placeholder="you@company.com"
          />

          <label className={label}>{t("password")}</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
            placeholder={t("passwordHint")}
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 h-[44px] w-full rounded-[10px] bg-[#1F8A5B] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? t("creatingAccount") : t("createAccount")}
          </button>

          <p className="mt-5 text-center text-[13px] text-gray-500">
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-semibold text-[#1F8A5B] hover:underline">
              {t("signIn")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
