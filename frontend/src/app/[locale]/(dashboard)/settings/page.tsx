"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth, useClerk, useUser } from "@/components/auth";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { api, ApiError, type CurrentUser, type OrgUser } from "@/lib/api";

const ROLE_LABEL_KEY: Record<OrgUser["role"], string> = {
  owner: "businessOwner",
  legal_reviewer: "legalReviewer",
  member: "teamMember",
  admin: "admin",
};

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken(), [getToken]);
  const { user } = useUser();
  const clerk = useClerk();

  const [me, setMe] = useState<CurrentUser | null>(null);
  const [team, setTeam] = useState<OrgUser[] | null>(null);
  const [teamRestricted, setTeamRestricted] = useState(false);

  useEffect(() => {
    api.me
      .get(tokenFn)
      .then(setMe)
      .catch(() => {});
    api.members
      .list(tokenFn)
      .then(setTeam)
      .catch((err) => {
        // Non-admins can't list members — show only themselves, not an error.
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) setTeamRestricted(true);
      });
  }, [tokenFn]);

  const displayName = me?.name || user?.fullName || user?.primaryEmailAddress?.emailAddress || "";
  const displayEmail = me?.email || user?.primaryEmailAddress?.emailAddress || "";
  const roleLabel = me ? t(ROLE_LABEL_KEY[me.role]) : "—";
  const teamRows: OrgUser[] = team ?? (me ? [me] : []);

  function switchLocale(target: string) {
    if (target !== locale) {
      router.replace(pathname || "/", { locale: target });
      router.refresh();
    }
  }

  function openInvite() {
    // Real invitations are managed by Clerk Organizations.
    try {
      clerk.openOrganizationProfile?.();
    } catch {
      clerk.openUserProfile();
    }
  }

  return (
    <div className="mx-auto max-w-[920px] px-7 py-6 pb-10">
      {/* profile */}
      <div className="mb-[18px] rounded-[14px] border border-border bg-card p-[22px]">
        <div className="mb-[18px] text-sm font-bold">{t("profile")}</div>
        <div className="mb-[18px] flex items-center gap-4">
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt={displayName} className="size-[62px] rounded-full object-cover" />
          ) : (
            <div
              className="flex size-[62px] items-center justify-center rounded-full text-[22px] font-bold text-white"
              style={{ background: "linear-gradient(140deg,#234C3D,#1F8A5B)" }}
            >
              {displayName || displayEmail ? initialsOf(displayName, displayEmail) : "—"}
            </div>
          )}
          <div>
            <button
              onClick={() => clerk.openUserProfile()}
              className="h-[34px] rounded-[9px] border border-border bg-card px-3.5 text-xs font-semibold text-secondary-foreground transition-colors hover:border-accent"
            >
              {t("changePhoto")}
            </button>
            <div className="mt-1.5 text-[11px] text-muted-foreground">{t("photoHint")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <ReadField label={t("fullName")} value={displayName || "—"} />
          <ReadField label={t("email")} value={displayEmail || "—"} />
          <ReadField label={t("role")} value={roleLabel} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground/80">{t("preferredLanguage")}</label>
            <div className="flex gap-2">
              {routing.locales.map((loc) => {
                const active = loc === locale;
                return (
                  <button
                    key={loc}
                    onClick={() => switchLocale(loc)}
                    className={
                      active
                        ? "h-10 flex-1 rounded-[10px] border border-accent bg-risk-low-bg text-[12.5px] font-semibold text-primary"
                        : "h-10 flex-1 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-secondary-foreground transition-colors hover:border-accent"
                    }
                  >
                    {loc === "ar" ? t("arabic") : t("english")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* security — managed by Clerk */}
      <div className="mb-[18px] rounded-[14px] border border-border bg-card p-[22px]">
        <div className="mb-4 text-sm font-bold">{t("security")}</div>
        <div className="flex items-center justify-between border-b border-border/60 py-3.5">
          <div>
            <div className="text-[13px] font-semibold">{t("password")}</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{t("passwordLastChanged")}</div>
          </div>
          <button
            onClick={() => clerk.openUserProfile()}
            className="h-[34px] rounded-[9px] border border-border bg-card px-3.5 text-xs font-semibold text-secondary-foreground transition-colors hover:border-accent"
          >
            {t("change")}
          </button>
        </div>
        <div className="flex items-center justify-between border-b border-border/60 py-3.5">
          <div>
            <div className="text-[13px] font-semibold">{t("mfa")}</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{t("mfaDetail")}</div>
          </div>
          <button
            onClick={() => clerk.openUserProfile()}
            className="h-[34px] rounded-[9px] border border-border bg-card px-3.5 text-xs font-semibold text-secondary-foreground transition-colors hover:border-accent"
          >
            {t("manageMfa")}
          </button>
        </div>
        <div className="flex items-center justify-between py-3.5">
          <div>
            <div className="text-[13px] font-semibold">{t("activeSessions")}</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{t("activeSessionsDetail")}</div>
          </div>
          <button
            onClick={() => clerk.signOut()}
            className="h-[34px] rounded-[9px] border border-[#F2D4D4] bg-card px-3.5 text-xs font-semibold text-risk-high transition-opacity hover:opacity-80"
          >
            {t("signOutAll")}
          </button>
        </div>
      </div>

      {/* team members */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        <div className="flex items-center justify-between px-[22px] py-[18px] pb-3.5">
          <div className="text-sm font-bold">{t("teamMembers")}</div>
          <button
            onClick={openInvite}
            className="h-[34px] rounded-[9px] bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38]"
          >
            {t("invite")}
          </button>
        </div>
        {teamRestricted && (
          <div className="px-[22px] pb-3 text-[11.5px] text-muted-foreground">{t("teamRestricted")}</div>
        )}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-[22px] py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">{t("member")}</th>
              <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">{t("role")}</th>
              <th className="px-[22px] py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {teamRows.map((m) => (
              <tr key={m.id} className="border-t border-border/60">
                <td className="px-[22px] py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-[30px] items-center justify-center rounded-full bg-[#234C3D] text-[11px] font-bold text-white">
                      {initialsOf(m.name, m.email)}
                    </div>
                    <div>
                      <div className="text-[12.5px] font-semibold">{m.name || m.email}</div>
                      <div className="text-[11px] text-muted-foreground">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <span className="rounded-md bg-risk-low-bg px-2.5 py-1 text-[11px] font-semibold text-accent">{t(ROLE_LABEL_KEY[m.role])}</span>
                </td>
                <td className="px-[22px] py-3 text-[11px] font-semibold text-risk-low">{t("active")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground/80">{label}</label>
      <div className="flex h-10 w-full items-center rounded-[10px] border border-border bg-muted/40 px-3.5 text-[13px] text-muted-foreground">
        {value}
      </div>
    </div>
  );
}
