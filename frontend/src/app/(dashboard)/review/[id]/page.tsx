import { FileText, MessagesSquare, Download } from "lucide-react";
import { RiskBadge, type RiskLevel } from "@/components/risk-badge";
import { CitationChip } from "@/components/citation-chip";
import { RiskGauge } from "@/components/risk-gauge";

type Finding = {
  level: RiskLevel;
  ref: string;
  title: string;
  note: string;
  recommendation: string;
  citation: string;
};

const FINDINGS: Finding[] = [
  {
    level: "high",
    ref: "§9.2",
    title: "Uncapped client indemnity / unlimited liability",
    note: 'Clause 9.2 requires the Client to indemnify the Supplier "without limitation," exposing your business to unlimited and consequential damages while the Supplier\'s liability stays capped at 12 months\' fees.',
    recommendation:
      "Make the indemnity mutual and cap aggregate liability for both parties at 12 months' fees. Exclude consequential and indirect damages on both sides.",
    citation: "Saudi Civil Transactions Law, Art. 174 · Commercial best practice",
  },
  {
    level: "high",
    ref: "§11.3",
    title: "One-sided termination for convenience",
    note: "The Supplier can terminate on 7 days' notice with no reciprocal right for the Client, creating service-continuity and switching risk.",
    recommendation:
      "Grant both parties symmetric termination rights with a minimum 30–60 day notice period and a transition-assistance obligation.",
    citation: "Contract fairness · balanced-risk principle",
  },
  {
    level: "high",
    ref: "§13 · missing",
    title: "No PDPL-compliant data processing terms",
    note: "Clause 13.2 permits processing of employee personal data with no lawful basis, data-subject rights, breach-notification, or cross-border transfer safeguards as required by the Personal Data Protection Law.",
    recommendation:
      "Attach a Data Processing Addendum specifying lawful basis, purpose limitation, SDAIA transfer rules, and 72-hour breach notification.",
    citation: "PDPL Art. 5, 12, 19 · SDAIA Implementing Regs",
  },
  {
    level: "medium",
    ref: "§15.1",
    title: "IP ownership tied to payment milestones",
    note: 'Deliverables remain Supplier property until "full and final payment," leaving ownership ambiguous during disputes or staged payments.',
    recommendation: "Define IP assignment on a per-milestone basis and grant an interim licence to avoid work stoppage.",
    citation: "Saudi Copyright Law · IP best practice",
  },
  {
    level: "low",
    ref: "§18.1 · missing",
    title: "Governing law not specified",
    note: "The jurisdiction placeholder is unfilled. For a Saudi entity, disputes should be resolved under KSA law.",
    recommendation: "Specify the laws of the Kingdom of Saudi Arabia and Riyadh courts / SCCA arbitration.",
    citation: "",
  },
];

const COUNTS = {
  all: FINDINGS.length,
  high: FINDINGS.filter((f) => f.level === "high").length,
  medium: FINDINGS.filter((f) => f.level === "medium").length,
  low: FINDINGS.filter((f) => f.level === "low").length,
};

const LEVEL_STYLE: Record<RiskLevel, { borderColor: string; borderInlineStart: string }> = {
  high: { borderColor: "#F2D4D4", borderInlineStart: "3px solid var(--risk-high)" },
  medium: { borderColor: "#F3E2C9", borderInlineStart: "3px solid var(--risk-medium)" },
  low: { borderColor: "#D7EEE3", borderInlineStart: "3px solid var(--risk-low)" },
};

export default async function DocumentAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-[1340px] px-7 py-[22px] pb-10">
      {/* doc header */}
      <div className="mb-[18px] flex flex-wrap items-center gap-3.5">
        <div className="flex size-11 flex-none items-center justify-center rounded-[11px] bg-risk-high-bg">
          <FileText className="size-[22px] text-risk-high" strokeWidth={1.8} />
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="text-lg font-bold tracking-tight">CloudServe Master Services Agreement — v3.docx</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground/70">Vendor Contract</span>
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground/70">14 pages</span>
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground/70">6,240 words</span>
            <span className="font-mono-data rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground/70">
              Analyzed 2h ago · ID {id}
            </span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button className="flex h-[38px] items-center gap-[7px] rounded-[10px] border border-border bg-card px-[15px] text-[13px] font-semibold text-secondary-foreground transition-colors hover:border-accent">
            <MessagesSquare className="size-[15px]" strokeWidth={1.8} />
            Ask Assistant
          </button>
          <button className="flex h-[38px] items-center gap-[7px] rounded-[10px] bg-primary px-[18px] text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38]">
            <Download className="size-[15px]" strokeWidth={1.8} />
            Export Report
          </button>
        </div>
      </div>

      {/* risk overview */}
      <div className="mb-[18px] grid grid-cols-[280px_1fr] gap-[18px]">
        <div className="flex flex-col items-center rounded-[14px] border border-border bg-card p-5">
          <RiskGauge score={78} size={128} strokeWidth={13} color="#DC2626">
            <div className="font-mono-data text-[40px] font-bold leading-none text-risk-high">78</div>
            <div className="text-[10px] text-muted-foreground">RISK SCORE</div>
          </RiskGauge>
          <div className="mt-3.5">
            <RiskBadge level="high" label="High Risk" className="px-[13px] py-[5px] text-[12.5px] font-bold" />
          </div>
          <div className="mt-4 flex w-full flex-col gap-2.5">
            <SeverityBar label="High severity" value={4} pct={80} color="var(--risk-high)" />
            <SeverityBar label="Medium severity" value={5} pct={55} color="var(--risk-medium)" />
            <SeverityBar label="Low / advisory" value={8} pct={35} color="var(--risk-low)" />
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-card p-5">
          <div className="mb-[11px] flex items-center gap-2">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="m12 3 1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10z" stroke="#1F8A5B" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            <div className="text-sm font-bold">AI Risk Summary</div>
          </div>
          <p className="mb-3.5 text-[13.5px] leading-[1.65] text-secondary-foreground/80">
            This Master Services Agreement carries <b>high overall risk</b>, driven primarily by an{" "}
            <b>uncapped liability</b> clause and a <b>unilateral termination</b> right favoring the supplier. The
            agreement also lacks a data-protection clause aligned with Saudi <b>PDPL</b> requirements and omits a
            governing-law provision, which defaults dispute resolution outside the Kingdom.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[10px] border border-[#F8DADA] bg-[#FDF5F5] p-[11px_13px]">
              <div className="mb-1 text-[11px] font-bold text-risk-high">⚠ Top priority</div>
              <div className="text-xs leading-[1.4] text-secondary-foreground/80">
                Cap liability and add mutual indemnity (§9.2).
              </div>
            </div>
            <div className="rounded-[10px] border border-[#D7EEE3] bg-[#F4FAF7] p-[11px_13px]">
              <div className="mb-1 text-[11px] font-bold text-risk-low">✦ AI recommends</div>
              <div className="text-xs leading-[1.4] text-secondary-foreground/80">
                Insert PDPL data-processing addendum (Art. 5, 19).
              </div>
            </div>
          </div>
          <div className="mt-3.5 rounded-[10px] border border-[#EDE6C8] bg-[#FBFAF4] p-[11px_13px]">
            <div className="mb-1.5 text-[11.5px] font-bold text-[#9A7B12]">Missing clauses detected (3)</div>
            <div className="flex flex-wrap gap-1.5">
              {["Governing law & jurisdiction", "PDPL data processing", "Force majeure"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#EDE6C8] bg-card px-2.5 py-1 text-[11px] font-semibold text-[#7A6510]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* two-column: doc viewer + findings */}
      <div className="grid grid-cols-2 items-start gap-[18px]">
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-[13px]">
            <div className="text-[13px] font-bold">Document</div>
            <div className="flex items-center gap-[11px] text-[10.5px] text-muted-foreground">
              <LegendDot color="#FBD5D5" label="High" />
              <LegendDot color="#FBE4C0" label="Medium" />
              <LegendDot color="#CDEBDC" label="Low" />
            </div>
          </div>
          <div className="ca-scroll max-h-[560px] overflow-y-auto px-[22px] py-5 font-mono-data text-[12.5px] leading-[1.9] text-secondary-foreground/80">
            <p className="mb-1.5 font-bold text-foreground">9. LIMITATION OF LIABILITY</p>
            <p className="mb-3.5">
              9.1 Each party&apos;s aggregate liability arising out of this Agreement shall be limited to the fees
              paid in the twelve (12) months preceding the claim.{" "}
              <mark className="rounded-sm bg-[#FBD5D5] px-0.5 py-px" style={{ borderBottom: "2px solid #DC2626" }}>
                9.2 Notwithstanding the foregoing, Client shall indemnify Supplier against any and all losses
                without limitation, including consequential and indirect damages.
              </mark>
            </p>
            <p className="mb-1.5 font-bold text-foreground">11. TERM AND TERMINATION</p>
            <p className="mb-3.5">
              11.1 This Agreement commences on the Effective Date and continues for an initial term of twelve (12)
              months.{" "}
              <mark className="rounded-sm bg-[#FBD5D5] px-0.5 py-px" style={{ borderBottom: "2px solid #DC2626" }}>
                11.3 Supplier may terminate this Agreement for convenience upon seven (7) days&apos; written notice;
                Client shall have no equivalent right.
              </mark>
            </p>
            <p className="mb-1.5 font-bold text-foreground">13. CONFIDENTIALITY &amp; DATA</p>
            <p className="mb-3.5">
              13.1 Each party shall keep Confidential Information secret.{" "}
              <mark className="rounded-sm bg-[#FBE4C0] px-0.5 py-px" style={{ borderBottom: "2px solid #D97706" }}>
                13.2 Supplier may process personal data of Client&apos;s employees as reasonably necessary.
              </mark>{" "}
              No reference is made to data subject rights, cross-border transfer, or a lawful processing basis.
            </p>
            <p className="mb-1.5 font-bold text-foreground">15. INTELLECTUAL PROPERTY</p>
            <p className="mb-3.5">
              <mark className="rounded-sm bg-[#FBE4C0] px-0.5 py-px" style={{ borderBottom: "2px solid #D97706" }}>
                15.1 All deliverables and work product shall remain the property of Supplier until full and final
                payment is received.
              </mark>{" "}
              15.2 Client receives a non-exclusive licence during the Term.
            </p>
            <p className="mb-1.5 font-bold text-foreground">18. GOVERNING LAW</p>
            <p>
              <mark className="rounded-sm bg-[#CDEBDC] px-0.5 py-px" style={{ borderBottom: "2px solid #1F8A5B" }}>
                18.1 This Agreement shall be governed by the laws of [JURISDICTION NOT SPECIFIED].
              </mark>{" "}
              18.2 Disputes shall be referred to arbitration.
            </p>
          </div>
        </div>

        {/* findings */}
        <div>
          <div className="mb-3.5 flex gap-1.5">
            <FilterChip label={`All · ${COUNTS.all}`} active />
            <FilterChip label={`High · ${COUNTS.high}`} color="var(--risk-high)" />
            <FilterChip label={`Medium · ${COUNTS.medium}`} color="var(--risk-medium)" />
            <FilterChip label={`Low · ${COUNTS.low}`} color="var(--risk-low)" />
          </div>
          <div className="ca-scroll flex max-h-[560px] flex-col gap-3 overflow-y-auto pe-1">
            {FINDINGS.map((f) => (
              <div key={f.title} className="rounded-[11px] border bg-card p-[15px]" style={LEVEL_STYLE[f.level]}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{
                      background:
                        f.level === "high" ? "var(--risk-high-bg)" : f.level === "medium" ? "var(--risk-medium-bg)" : "var(--risk-low-bg)",
                      color: f.level === "high" ? "var(--risk-high)" : f.level === "medium" ? "var(--risk-medium)" : "var(--risk-low)",
                    }}
                  >
                    {f.level}
                  </span>
                  <span className="font-mono-data text-[11px] text-muted-foreground">{f.ref}</span>
                </div>
                <div className="mb-1.5 text-[13.5px] font-bold">{f.title}</div>
                <div className="mb-2.5 text-[12.5px] leading-[1.55] text-muted-foreground">{f.note}</div>
                <div className="mb-2.5 rounded-[9px] bg-[#F4FAF7] p-[10px_12px]">
                  <div className="mb-1 text-[10.5px] font-bold text-accent">RECOMMENDATION</div>
                  <div className="text-xs leading-[1.5] text-secondary-foreground/80">{f.recommendation}</div>
                </div>
                {f.citation ? <CitationChip source={f.citation} /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SeverityBar({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-[3px] flex justify-between text-[11.5px]">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono-data font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-[5px] rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function FilterChip({ label, active, color }: { label: string; active?: boolean; color?: string }) {
  return (
    <span
      className="cursor-pointer rounded-lg px-[13px] py-1.5 text-xs font-semibold"
      style={
        active
          ? { background: "var(--primary)", color: "var(--primary-foreground)" }
          : { background: "var(--card)", border: "1px solid var(--border)", color: color ?? "var(--secondary-foreground)" }
      }
    >
      {label}
    </span>
  );
}
