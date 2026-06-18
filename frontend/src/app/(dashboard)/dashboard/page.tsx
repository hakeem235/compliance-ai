import Link from "next/link";
import { FileText, AlertTriangle, Clock, ShieldCheck, Sparkles, MessagesSquare } from "lucide-react";
import { RiskGauge } from "@/components/risk-gauge";
import { RiskBadge, type RiskLevel } from "@/components/risk-badge";
import { AiDisclaimer } from "@/components/citation-chip";

const STATS = [
  { label: "Documents reviewed", value: "148", delta: "↑ 12 this week", deltaClass: "text-risk-low", icon: FileText, iconBg: "bg-risk-low-bg", iconColor: "#1F8A5B" },
  { label: "Active alerts", value: "5", delta: "2 urgent", deltaClass: "text-risk-high", icon: AlertTriangle, iconBg: "bg-risk-high-bg", iconColor: "#DC2626" },
  { label: "Expiring contracts", value: "3", delta: "within 30 days", deltaClass: "text-risk-medium", icon: Clock, iconBg: "bg-risk-medium-bg", iconColor: "#D97706" },
  { label: "Compliance status", value: "86%", delta: "PDPL on track", deltaClass: "text-risk-low", icon: ShieldCheck, iconBg: "bg-risk-low-bg", iconColor: "#1F8A5B" },
];

const RECENT_REVIEWS: { name: string; type: string; score: number; risk: RiskLevel; when: string }[] = [
  { name: "CloudServe MSA v3.docx", type: "Vendor Contract", score: 78, risk: "high", when: "2h ago" },
  { name: "Employment_Contract_Sara.pdf", type: "Employment", score: 54, risk: "medium", when: "5h ago" },
  { name: "NDA_Mutual_Tahaluf.docx", type: "NDA", score: 22, risk: "low", when: "1d ago" },
  { name: "Freelance_Design_Agmt.pdf", type: "Freelance", score: 47, risk: "medium", when: "2d ago" },
];

const ALERTS = [
  { text: "Update privacy notice for PDPL consent", meta: "PDPL · due in 6 days", level: "high" as const },
  { text: "File GOSI contributions — May", meta: "Labor Law · due in 12 days", level: "high" as const },
  { text: "Commercial registration renewal", meta: "Commercial · due in 21 days", level: "medium" as const },
];

const EXPIRING = [
  { day: "28", mon: "Jun", name: "CloudServe MSA", note: "Auto-renews — review now", urgent: true },
  { day: "09", mon: "Jul", name: "Office Lease — Riyadh", note: "60-day notice required", urgent: true },
  { day: "15", mon: "Jul", name: "Marketing Retainer", note: "Ends · no renewal", urgent: false },
];

const ACTIVITY = [
  { icon: Sparkles, iconBg: "bg-risk-low-bg", iconColor: "#1F8A5B", bold: "Analyzed", text: "CloudServe MSA v3 — found 7 high-risk clauses", time: "14:22 · Today" },
  { icon: MessagesSquare, iconBg: "bg-[#EEF3FF]", iconColor: "#2A6FDB", bold: "Assistant answered:", text: "Is a non-compete enforceable under Saudi Labor Law?", time: "11:08 · Today" },
  { icon: FileText, iconBg: "bg-[#F3EEFF]", iconColor: "#7C5CFF", bold: "Generated", text: "Mutual NDA from questionnaire (Arabic + English)", time: "09:41 · Yesterday" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-7 py-[26px] pb-10">
      {/* top row: risk gauge + 4 stats */}
      <div className="mb-[18px] grid grid-cols-[300px_1fr] gap-[18px]">
        <div className="relative overflow-hidden rounded-2xl bg-sidebar p-[22px] text-sidebar-foreground">
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 80% 0%,rgba(52,211,153,0.18),transparent 55%)" }}
          />
          <div className="relative">
            <div className="mb-1 text-[12.5px] font-semibold text-sidebar-foreground-muted">
              Organization Risk Score
            </div>
            <div className="flex items-center gap-[18px]">
              <RiskGauge score={62} variant="dark">
                <div className="font-mono-data text-[30px] font-bold leading-none">62</div>
                <div className="text-[9.5px] tracking-wide text-white/50">/ 100</div>
              </RiskGauge>
              <div className="flex-1">
                <div className="mb-[9px] inline-flex items-center gap-1.5 rounded-full bg-[#F5B544]/[0.18] px-2.5 py-1 text-[11.5px] font-semibold text-[#F7C56E]">
                  Moderate exposure
                </div>
                <div className="text-[11.5px] leading-[1.5] text-white/60">
                  7 high-risk clauses need attention across 3 active contracts.
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-[7px]">
              <div className="flex-1 rounded-[9px] bg-white/[0.06] px-1 py-2 text-center">
                <div className="font-mono-data text-[17px] font-bold text-[#FF8A8A]">7</div>
                <div className="mt-px text-[9.5px] text-white/50">High</div>
              </div>
              <div className="flex-1 rounded-[9px] bg-white/[0.06] px-1 py-2 text-center">
                <div className="font-mono-data text-[17px] font-bold text-[#F7C56E]">14</div>
                <div className="mt-px text-[9.5px] text-white/50">Medium</div>
              </div>
              <div className="flex-1 rounded-[9px] bg-white/[0.06] px-1 py-2 text-center">
                <div className="font-mono-data text-[17px] font-bold text-[#5BD6A0]">23</div>
                <div className="mt-px text-[9.5px] text-white/50">Low</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-[14px] border border-border bg-card p-[17px_18px]">
              <div className="flex items-start justify-between">
                <div className="text-xs font-medium text-muted-foreground">{stat.label}</div>
                <div className={`flex size-[30px] items-center justify-center rounded-lg ${stat.iconBg}`}>
                  <stat.icon className="size-4" style={{ color: stat.iconColor }} strokeWidth={1.8} />
                </div>
              </div>
              <div className="mt-2.5 font-mono-data text-[28px] font-bold tracking-tight">{stat.value}</div>
              <div className={`mt-0.5 text-[11px] font-semibold ${stat.deltaClass}`}>{stat.delta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* second row: recent reviews + right column */}
      <div className="grid grid-cols-[1fr_360px] gap-[18px]">
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-[18px] py-[13px]">
            <div className="text-sm font-bold">Recent reviews</div>
            <Link href="/review" className="text-xs font-semibold text-accent hover:underline">
              View all →
            </Link>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-[18px] py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Document</th>
                <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                <th className="px-2 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Risk</th>
                <th className="px-[18px] py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_REVIEWS.map((doc) => (
                <tr key={doc.name} className="cursor-pointer border-t border-border/70 hover:bg-muted/30">
                  <td className="px-[18px] py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-[30px] flex-none items-center justify-center rounded-[7px]"
                        style={{
                          background:
                            doc.risk === "high" ? "var(--risk-high-bg)" : doc.risk === "medium" ? "var(--risk-medium-bg)" : "var(--risk-low-bg)",
                        }}
                      >
                        <FileText
                          className="size-3.5"
                          style={{
                            color:
                              doc.risk === "high" ? "var(--risk-high)" : doc.risk === "medium" ? "var(--risk-medium)" : "var(--risk-low)",
                          }}
                          strokeWidth={1.8}
                        />
                      </div>
                      <span className="text-[13px] font-semibold">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-[12.5px] text-muted-foreground">{doc.type}</td>
                  <td className="px-2 py-3">
                    <RiskBadge level={doc.risk} score={doc.score} />
                  </td>
                  <td className="px-[18px] py-3 font-mono-data text-xs text-muted-foreground">{doc.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-[18px]">
          <div className="rounded-[14px] border border-border bg-card p-[16px_18px]">
            <div className="mb-[13px] text-sm font-bold">Compliance alerts</div>
            <div className="flex flex-col gap-[11px]">
              {ALERTS.map((alert) => (
                <div key={alert.text} className="flex gap-[11px]">
                  <span
                    className="mt-1.5 size-2 flex-none rounded-full"
                    style={{ background: alert.level === "high" ? "var(--risk-high)" : "var(--risk-medium)" }}
                  />
                  <div>
                    <div className="text-[12.5px] font-semibold leading-tight">{alert.text}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{alert.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-border bg-card p-[16px_18px]">
            <div className="mb-[13px] flex items-center justify-between">
              <div className="text-sm font-bold">Expiring contracts</div>
              <Link href="/stay-compliant" className="text-xs font-semibold text-accent hover:underline">
                Calendar →
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {EXPIRING.map((item) => (
                <div key={item.name} className="flex items-center gap-[11px]">
                  <div className="w-[38px] flex-none text-center">
                    <div className="font-mono-data text-base font-bold leading-none">{item.day}</div>
                    <div className="text-[9px] uppercase text-muted-foreground">{item.mon}</div>
                  </div>
                  <div
                    className="flex-1 ps-[11px]"
                    style={{ borderInlineStart: `2px solid ${item.urgent ? "#FEE2C8" : "#D7EEE3"}` }}
                  >
                    <div className="text-[12.5px] font-semibold">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground">{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI activity */}
      <div className="mt-[18px] rounded-[14px] border border-border bg-card p-[16px_18px]">
        <div className="mb-3.5 text-sm font-bold">AI activity</div>
        <div className="flex flex-col">
          {ACTIVITY.map((item, i) => (
            <div key={item.text} className="flex gap-[13px] pb-[13px] last:pb-0">
              <div className="flex flex-col items-center">
                <div className={`flex size-[30px] flex-none items-center justify-center rounded-lg ${item.iconBg}`}>
                  <item.icon className="size-[15px]" style={{ color: item.iconColor }} strokeWidth={1.7} />
                </div>
                {i < ACTIVITY.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="pt-[5px]">
                <div className="text-[12.5px]">
                  <b>{item.bold}</b> {item.text}
                </div>
                <div className="mt-0.5 font-mono-data text-[11px] text-muted-foreground">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AiDisclaimer className="mt-5" />
    </div>
  );
}
