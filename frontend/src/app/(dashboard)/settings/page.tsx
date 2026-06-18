const TEAM = [
  { initials: "FA", color: "#234C3D", name: "Faisal Al-Otaibi", email: "faisal@najd.sa", role: "Business Owner", roleColor: "var(--risk-low)", roleBg: "var(--risk-low-bg)", mfa: "On", status: "Active" },
  { initials: "SA", color: "#2A6FDB", name: "Sara Al-Harbi", email: "sara@najd.sa", role: "Legal Reviewer", roleColor: "#2A6FDB", roleBg: "#EEF3FF", mfa: "On", status: "Active" },
  { initials: "MK", color: "#7C5CFF", name: "Mishari Khan", email: "mishari@najd.sa", role: "Team Member", roleColor: "#7C5CFF", roleBg: "#F3EEFF", mfa: "Pending", status: "Invited" },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[920px] px-7 py-6 pb-10">
      {/* profile */}
      <div className="mb-[18px] rounded-[14px] border border-border bg-card p-[22px]">
        <div className="mb-[18px] text-sm font-bold">Profile</div>
        <div className="mb-[18px] flex items-center gap-4">
          <div
            className="flex size-[62px] items-center justify-center rounded-full text-[22px] font-bold text-white"
            style={{ background: "linear-gradient(140deg,#234C3D,#1F8A5B)" }}
          >
            FA
          </div>
          <div>
            <button className="h-[34px] rounded-[9px] border border-border bg-card px-3.5 text-xs font-semibold text-secondary-foreground">
              Change photo
            </button>
            <div className="mt-1.5 text-[11px] text-muted-foreground">JPG or PNG, max 2MB</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Full name" defaultValue="Faisal Al-Otaibi" />
          <Field label="Email" defaultValue="faisal@najd.sa" />
          <Field label="Role" defaultValue="Business Owner" disabled />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground/80">Preferred language</label>
            <div className="flex gap-2">
              <button className="h-10 flex-1 rounded-[10px] border border-accent bg-risk-low-bg text-[12.5px] font-semibold text-primary">
                English
              </button>
              <button className="h-10 flex-1 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-secondary-foreground">
                العربية
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* security */}
      <div className="mb-[18px] rounded-[14px] border border-border bg-card p-[22px]">
        <div className="mb-4 text-sm font-bold">Security</div>
        <div className="flex items-center justify-between border-b border-border/60 py-3.5">
          <div>
            <div className="text-[13px] font-semibold">Password</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">Last changed 3 months ago</div>
          </div>
          <button className="h-[34px] rounded-[9px] border border-border bg-card px-3.5 text-xs font-semibold text-secondary-foreground">
            Change
          </button>
        </div>
        <div className="flex items-center justify-between border-b border-border/60 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold">Multi-factor authentication</span>
              <span className="rounded-full bg-risk-low-bg px-2 py-0.5 text-[10px] font-bold text-accent">ON</span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">Authenticator app · backup codes generated</div>
          </div>
          <div className="relative h-6 w-11 rounded-full bg-accent">
            <span className="absolute end-0.5 top-0.5 size-5 rounded-full bg-white" />
          </div>
        </div>
        <div className="flex items-center justify-between py-3.5">
          <div>
            <div className="text-[13px] font-semibold">Active sessions</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">2 devices · Riyadh, Jeddah</div>
          </div>
          <button className="h-[34px] rounded-[9px] border border-[#F2D4D4] bg-card px-3.5 text-xs font-semibold text-risk-high">
            Sign out all
          </button>
        </div>
      </div>

      {/* team members */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        <div className="flex items-center justify-between px-[22px] py-[18px] pb-3.5">
          <div className="text-sm font-bold">Team members</div>
          <button className="h-[34px] rounded-[9px] bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38]">
            + Invite
          </button>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-[22px] py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">Member</th>
              <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">Role</th>
              <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">MFA</th>
              <th className="px-[22px] py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">Status</th>
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
                    {m.role}
                  </span>
                </td>
                <td className="px-2 py-3 text-[11px] font-semibold" style={{ color: m.mfa === "On" ? "var(--risk-low)" : "var(--risk-medium)" }}>
                  {m.mfa}
                </td>
                <td className="px-[22px] py-3 text-[11px] font-semibold" style={{ color: m.status === "Active" ? "var(--risk-low)" : "var(--muted-foreground)" }}>
                  {m.status}
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
