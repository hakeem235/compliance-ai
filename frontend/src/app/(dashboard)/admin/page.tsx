import { FileText, Check, Loader2 } from "lucide-react";

const STATS = [
  { label: "Active users", value: "6" },
  { label: "Docs analyzed (30d)", value: "312" },
  { label: "AI calls (30d)", value: "1,847" },
  { label: "Storage used", value: "2.4", unit: "GB" },
];

const AUDIT_LOG = [
  { event: "Document analyzed", detail: "CloudServe MSA v3", actor: "Faisal A.", time: "14:22" },
  { event: "Role changed", detail: "Sara → Legal Reviewer", actor: "Faisal A.", time: "13:05" },
  { event: "Document exported", detail: "Mutual NDA (PDF)", actor: "Sara H.", time: "11:48" },
  { event: "MFA enabled", detail: "Account security", actor: "Sara H.", time: "09:30" },
  { event: "Member invited", detail: "mishari@najd.sa", actor: "Faisal A.", time: "Yesterday" },
];

const KNOWLEDGE_BASE = [
  { name: "Saudi Labor Law", meta: "245 articles · indexed", status: "done" as const },
  { name: "PDPL + SDAIA regs", meta: "1,120 chunks · indexed", status: "done" as const },
  { name: "Commercial regulations", meta: "680 chunks · indexed", status: "done" as const },
  { name: "Company policies", meta: "re-embedding…", status: "loading" as const },
];

const JURISDICTIONS = [
  { label: "🇸🇦 Saudi · Live", active: true },
  { label: "UAE · Q3", active: false },
  { label: "Bahrain", active: false },
  { label: "Kuwait", active: false },
  { label: "Qatar", active: false },
  { label: "UK · USA", active: false },
];

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-7 py-6 pb-10">
      {/* stats */}
      <div className="mb-[18px] grid grid-cols-4 gap-3.5">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-[14px] border border-border bg-card p-[16px_18px]">
            <div className="text-[11.5px] font-medium text-muted-foreground">{s.label}</div>
            <div className="font-mono-data mt-1.5 text-2xl font-bold">
              {s.value}
              {s.unit && <span className="text-sm text-muted-foreground">{s.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_360px] items-start gap-[18px]">
        {/* audit log */}
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-[18px] py-4">
            <div className="text-sm font-bold">Audit log</div>
            <span className="rounded-full bg-risk-low-bg px-2.5 py-0.5 text-[11px] font-semibold text-accent">
              Immutable · RBAC enforced
            </span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-[18px] py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">Event</th>
                <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">Actor</th>
                <th className="px-[18px] py-2.5 text-start text-[10.5px] font-semibold uppercase text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {AUDIT_LOG.map((row, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="px-[18px] py-[11px]">
                    <div className="text-[12.5px] font-semibold">{row.event}</div>
                    <div className="text-[11px] text-muted-foreground">{row.detail}</div>
                  </td>
                  <td className="px-2 py-[11px] text-xs text-secondary-foreground/80">{row.actor}</td>
                  <td className="font-mono-data px-[18px] py-[11px] text-[11.5px] text-muted-foreground">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* knowledge base */}
        <div className="flex flex-col gap-[18px]">
          <div className="rounded-[14px] border border-border bg-card p-[18px]">
            <div className="mb-3.5 flex items-center gap-2">
              <FileText className="size-[17px] text-primary" strokeWidth={1.7} />
              <div className="text-sm font-bold">RAG knowledge base</div>
            </div>
            <div className="flex flex-col gap-2.5">
              {KNOWLEDGE_BASE.map((kb) => (
                <div
                  key={kb.name}
                  className="flex items-center gap-2.5 rounded-[10px] p-[11px_12px]"
                  style={{ background: kb.status === "loading" ? "#FEF9EE" : "var(--muted)" }}
                >
                  <span
                    className="size-2 flex-none rounded-full"
                    style={{ background: kb.status === "loading" ? "var(--risk-medium)" : "var(--risk-low)" }}
                  />
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold">{kb.name}</div>
                    <div className="font-mono-data text-[10.5px] text-muted-foreground">{kb.meta}</div>
                  </div>
                  {kb.status === "done" ? (
                    <Check className="size-[15px] text-accent" strokeWidth={2.2} />
                  ) : (
                    <Loader2 className="size-[15px] animate-spin text-risk-medium" strokeWidth={2.4} />
                  )}
                </div>
              ))}
            </div>
            <button className="mt-3.5 h-[38px] w-full rounded-[9px] border border-border bg-card text-[12.5px] font-semibold text-secondary-foreground transition-colors hover:border-accent">
              + Add source
            </button>
          </div>

          <div className="rounded-[14px] border border-border bg-card p-[18px]">
            <div className="mb-[11px] text-[13px] font-bold">Jurisdiction roadmap</div>
            <div className="flex flex-wrap gap-[7px]">
              {JURISDICTIONS.map((j) => (
                <span
                  key={j.label}
                  className={`rounded-full px-[11px] py-1 text-[11px] font-semibold ${
                    j.active ? "bg-risk-low-bg text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {j.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
