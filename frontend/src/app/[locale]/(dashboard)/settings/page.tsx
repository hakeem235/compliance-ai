import { useTranslations } from "next-intl";

const TEAM = [
  { initials: "FA", color: "#234C3D", name: "Faisal Al-Otaibi", email: "faisal@najd.sa", roleKey: "businessOwner", roleColor: "var(--risk-low)", roleBg: "var(--risk-low-bg)", mfa: "On", status: "Active" },
  { initials: "SA", color: "#2A6FDB", name: "Sara Al-Harbi", email: "sara@najd.sa", roleKey: "legalReviewer", roleColor: "#2A6FDB", roleBg: "#EEF3FF", mfa: "On", status: "Active" },
  { initials: "MK", color: "#7C5CFF", name: "Mishari Khan", email: "mishari@najd.sa", roleKey: "teamMember", roleColor: "#7C5CFF", roleBg: "#F3EEFF", mfa: "Pending", status: "Invited" },
];

export default function SettingsPage() {
  const t = useTranslations("Settings");

  return (
    <div className="mx-auto max-w-[920px] px-7 py-6 pb-10">
      {/* profile */}
      <div className="mb-[18px] rounded-[14px] border border-border bg-card p-[22px]">
        <div className="mb-[18px] text-sm font-bold">{t("profile")}</div>
        <div className="mb-[18px] flex items-center gap-4">
          <div
            className="flex size-[62px] items-center justify-center rounded-full text-[22px] font-bold text-white"
            style={{ background: "linear-gradient(140deg,#234C3D,#1F8A5B)" }}
          >
            FA
          </div>
          <div>
            <button className="h-[34px] rounded-[9px] border border-border bg-card px-3.5 text-xs font-semibold text-secondary-foreground">
              {t("changePhoto")}
            </button>
            <div className="mt-1.5 text-[11px] text-muted-foreground">{t("photoHint")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label={t("fullName")} defaultValue="Faisal Al-Otaibi" />
          <Field label={t("email")} defaultValue="faisal@najd.sa" />
          <Field label={t("role")} defaultValue={t("businessOwner")} disabled />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground/80">{t("preferredLanguage")}</label>
            <div className="flex gap-2">
              <button className="h-10 flex-1 rounded-[10px] border border-accent bg-risk-low-bg text-[12.5px] font-semibold text-primary">
                {t("english")}
              </button>
              <button className="h-10 flex-1 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-secondary-foreground">
                {t("arabic")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* security */}
      <div className="mb-[18px] rounded-[14px] border border-border bg-card p-[22px]">
        <div className="mb-4 text-sm font-bold">{t("security")}</div>
        <div className="flex items-center justify-between border-b border-border/60 py-3.5">
          <div>
            <div className="text-[13px] font-semibold">{t("password")}</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{t("passwordLastChanged")}</div>
          </div>
          <button className="h-[34px] rounded-[9px] border border-border bg-card px-3.5 text-xs font-semibold text-secondary-foreground">
            {t("change")}
          </button>
        </div>
        <div className="flex items-center justify-between border-b border-border/60 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold">{t("mfa")}</span>
              <span className="rounded-full bg-risk-low-bg px-2 py-0.5 text-[10px] font-bold text-accent">{t("on")}</span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{t("mfaDetail")}</div>
          </div>
          <div className="relative h-6 w-11 rounded-full bg-accent">
            <span className="absolute end-0.5 top-0.5 size-5 rounded-full bg-white" />
          </div>
        </div>
        <div className="flex items-center justify-between py-3.5">
          <div>
            <div className="text-[13px] font-semibold">{t("activeSessions")}</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{t("activeSessionsDetail")}</div>
          </div>
          <button className="h-[34px] rounded-[9px] border border-[#F2D4D4] bg-card px-3.5 text-xs font-semibold text-risk-high">
            {t("signOutAll")}
          </button>
        </div>
      </div>

      {/* team members */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        <div className="flex items-center justify-between px-[22px] py-[18px] pb-3.5">
          <div className="text-sm font-bold">{t("teamMembers")}</div>
          <button className="h-[34px] rounded-[9px] bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38]">
            {t("invite")}
          </button>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-[22px] py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">{t("member")}</th>
              <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">{t("role")}</th>
              <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">{t("mfaShort")}</th>
              <th className="px-[22px] py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {TEAM.map((m) => (
              <tr key={m.email} className="border-t border-border/60">
                <td className="px-[22px] py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-[30px] items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: m.color }}
                    >
                      {m.initials}
                    </div>
                    <div>
                      <div className="text-[12.5px] font-semibold">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <span
                    className="rounded-md px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: m.roleBg, color: m.roleColor }}
                  >
                    {t(m.roleKey)}
                  </span>
                </td>
                <td className="px-2 py-3 text-[11px] font-semibold" style={{ color: m.mfa === "On" ? "var(--risk-low)" : "var(--risk-medium)" }}>
                  {m.mfa === "On" ? t("on") : t("pending")}
                </td>
                <td className="px-[22px] py-3 text-[11px] font-semibold" style={{ color: m.status === "Active" ? "var(--risk-low)" : "var(--muted-foreground)" }}>
                  {m.status === "Active" ? t("active") : t("invited")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, defaultValue, disabled }: { label: string; defaultValue: string; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground/80">{label}</label>
      <input
        defaultValue={defaultValue}
        disabled={disabled}
        className="h-10 w-full rounded-[10px] border border-border px-3.5 text-[13px] outline-none focus:border-accent disabled:bg-muted disabled:text-muted-foreground"
      />
    </div>
  );
}
