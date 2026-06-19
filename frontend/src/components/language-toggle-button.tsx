"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";

export function LanguageToggleButton() {
  const t = useTranslations("DashboardLayout");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const nextLocale = routing.locales.find((l) => l !== locale) ?? locale;

  return (
    <button
      title={t("switchLanguage")}
      onClick={() => {
        router.replace(pathname, { locale: nextLocale });
        router.refresh();
      }}
      className="flex h-[38px] items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-[12.5px] font-semibold text-secondary-foreground transition-colors hover:border-accent"
    >
      <Globe className="size-[15px]" strokeWidth={1.8} />
      {t("languageButtonLabel")}
    </button>
  );
}
