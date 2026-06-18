"use client";

import { useState } from "react";
import { ArrowLeft, Check, FileDown, FileText } from "lucide-react";

const TEMPLATES = [
  { name: "Mutual NDA", desc: "Two-way confidentiality agreement", bg: "bg-risk-low-bg", color: "var(--risk-low)" },
  { name: "Employment Contract", desc: "Labor-Law compliant employment", bg: "bg-[#EEF3FF]", color: "#2A6FDB" },
  { name: "Freelance Agreement", desc: "Independent contractor terms", bg: "bg-[#F3EEFF]", color: "#7C5CFF" },
  { name: "Vendor Contract", desc: "Supplier / procurement MSA", bg: "bg-risk-medium-bg", color: "var(--risk-medium)" },
  { name: "Service Agreement", desc: "Scope, SLA & payment terms", bg: "bg-risk-low-bg", color: "var(--risk-low)" },
  { name: "Non-Compete", desc: "Restrictive covenant (≤2 yrs)", bg: "bg-risk-high-bg", color: "var(--risk-high)" },
  { name: "Warning Letter", desc: "Disciplinary notice (HR)", bg: "bg-risk-medium-bg", color: "var(--risk-medium)" },
  { name: "Termination Letter", desc: "End-of-service notice", bg: "bg-risk-high-bg", color: "var(--risk-high)" },
];

const STEP_LABELS = ["Parties", "Terms", "Review"];

export default function GeneratePage() {
  const [template, setTemplate] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  if (!template) {
    return (
      <div className="mx-auto max-w-[1080px] px-7 py-[26px] pb-10">
        <div className="mb-[18px]">
          <div className="text-[15px] font-bold">Choose a template</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            AI drafts a Saudi-compliant document from a short questionnaire — exportable as PDF or DOCX.
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                setTemplate(t.name);
                setStep(1);
              }}
              className="rounded-[14px] border border-border bg-card p-[18px] text-start transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
            >
              <div className={`mb-3 flex size-[38px] items-center justify-center rounded-[10px] ${t.bg}`}>
                <FileText className="size-[19px]" style={{ color: t.color }} strokeWidth={1.7} />
              </div>
              <div className="text-[13.5px] font-bold">{t.name}</div>
              <div className="mt-0.5 text-[11.5px] leading-[1.4] text-muted-foreground">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-2">
      {/* form side */}
      <div className="ca-scroll overflow-y-auto border-e border-border px-7 py-6">
        <button
          onClick={() => setTemplate(null)}
          className="mb-3.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-accent"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          All templates
        </button>
        <div className="text-[17px] font-bold tracking-tight">{template}</div>

        {/* steps indicator */}
        <div className="my-5 flex items-center">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done = step >= n;
            return (
              <div key={label} className="flex items-center">
                {i > 0 && <div className="mx-2.5 h-px w-10 bg-border" />}
                <div className="flex items-center gap-2">
                  <div
                    className="flex size-[26px] items-center justify-center rounded-full text-xs font-bold"
                    style={done ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "var(--muted)", color: "var(--muted-foreground)" }}
                  >
                    {n}
                  </div>
                  <span className={`text-xs font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <TextField label="Disclosing party (your company)" defaultValue="Najd Solutions LLC" />
            <TextField label="Receiving party" placeholder="e.g. Tahaluf Technologies" />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="CR number" placeholder="1010XXXXXX" />
              <TextField label="City" defaultValue="Riyadh" />
            </div>
            <div className="rounded-[11px] border border-[#DCEFE6] bg-[#F4FAF7] p-[12px_14px] text-[11.5px] leading-[1.4] text-secondary-foreground/80">
              <b>Bilingual output</b> — generate this document in English + Arabic side by side.
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground/80">Purpose of disclosure</label>
              <textarea
                defaultValue="Evaluation of a potential software integration partnership."
                className="h-[78px] w-full resize-none rounded-[10px] border border-border p-3 text-[13px] outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Confidentiality term" defaultValue="3 years" />
              <TextField label="Governing law" defaultValue="Saudi Arabia" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-secondary-foreground/80">Include clauses</label>
              <div className="flex flex-col gap-2">
                <CheckRow label="Return / destruction of materials" checked />
                <CheckRow label="Dispute resolution (SCCA arbitration)" checked />
                <CheckRow label="Non-solicitation of employees" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3.5">
            <div className="rounded-xl border border-[#D7EEE3] bg-risk-low-bg p-[14px_16px]">
              <div className="mb-1 flex items-center gap-2">
                <Check className="size-4 text-accent" strokeWidth={2.4} />
                <span className="text-[13px] font-bold text-primary">Draft ready</span>
              </div>
              <div className="text-xs leading-[1.5] text-secondary-foreground/80">
                AI generated a 4-page Mutual NDA with all selected clauses, validated against Saudi commercial
                standards. Review the live preview, then export.
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {[
                "Governing law set to Kingdom of Saudi Arabia",
                "Mutual obligations balanced for both parties",
                "Bilingual (EN + AR) ready",
              ].map((line) => (
                <div key={line} className="flex items-center gap-2 text-[12.5px] text-secondary-foreground/80">
                  <Check className="size-3.5 text-accent" strokeWidth={2.2} />
                  {line}
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2.5">
              <button className="flex h-[42px] flex-1 items-center justify-center gap-[7px] rounded-[10px] bg-primary text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38]">
                <FileDown className="size-[15px]" strokeWidth={1.8} />
                Export PDF
              </button>
              <button className="h-[42px] flex-1 rounded-[10px] border border-border bg-card text-[13px] font-semibold text-secondary-foreground">
                Export DOCX
              </button>
            </div>
          </div>
        )}

        {/* wizard nav */}
        <div className="mt-[26px] flex gap-2.5">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="h-10 rounded-[10px] border border-border bg-card px-[18px] text-[13px] font-semibold text-secondary-foreground"
          >
            Back
          </button>
          <div className="flex-1" />
          {step < 3 && (
            <button
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              className="h-10 rounded-[10px] bg-accent px-[22px] text-[13px] font-semibold text-accent-foreground transition-colors hover:bg-[#1A7A50]"
            >
              Continue →
            </button>
          )}
        </div>
      </div>

      {/* live preview */}
      <div className="ca-scroll overflow-y-auto bg-muted/40 p-6">
        <div className="mx-auto max-w-[480px] rounded-md bg-white p-[46px_44px] shadow-lg" style={{ minHeight: 600 }}>
          <div className="mb-[26px] text-center">
            <div className="text-base font-bold tracking-wide text-[#10201A]">MUTUAL NON-DISCLOSURE AGREEMENT</div>
            <div className="mt-1.5 text-[11px] text-[#9AA8A2]" dir="rtl">
              اتفاقية عدم إفصاح متبادلة
            </div>
          </div>
          <div className="text-[11.5px] leading-[1.85] text-[#3A4A44]" style={{ fontFamily: "Georgia, serif" }}>
            <p className="mb-3.5">
              This Mutual Non-Disclosure Agreement (&quot;Agreement&quot;) is entered into in <b>Riyadh</b>, Kingdom of
              Saudi Arabia by and between <b>Najd Solutions LLC</b> (&quot;Disclosing Party&quot;) and the{" "}
              <b>Receiving Party</b>.
            </p>
            <p className="mb-1 font-bold">1. Purpose</p>
            <p className="mb-3.5">
              The parties wish to explore a potential software integration partnership and may disclose certain
              confidential information for that purpose.
            </p>
            <p className="mb-1 font-bold">2. Confidential Information</p>
            <p className="mb-3.5">
              Each party shall protect the other&apos;s Confidential Information using no less than a reasonable
              standard of care and shall not disclose it to third parties.
            </p>
            <p className="mb-1 font-bold">3. Term</p>
            <p className="mb-3.5">
              Confidentiality obligations shall survive for a period of <b>three (3) years</b> from the date of
              disclosure.
            </p>
            <p className="mb-1 font-bold">4. Governing Law</p>
            <p className="mb-2">
              This Agreement shall be governed by the laws of the <b>Kingdom of Saudi Arabia</b>; disputes shall be
              referred to SCCA arbitration in Riyadh.
            </p>
          </div>
          <div className="mt-[30px] flex justify-between">
            <div className="w-[42%] border-t border-[#D6DEDA] pt-1.5 text-[10px] text-[#9AA8A2]">Disclosing Party</div>
            <div className="w-[42%] border-t border-[#D6DEDA] pt-1.5 text-[10px] text-[#9AA8A2]">Receiving Party</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, defaultValue, placeholder }: { label: string; defaultValue?: string; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground/80">{label}</label>
      <input
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 w-full rounded-[10px] border border-border px-[13px] text-[13px] outline-none focus:border-accent"
      />
    </div>
  );
}

function CheckRow({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 text-[12.5px]" style={{ color: checked ? undefined : "var(--muted-foreground)" }}>
      <span
        className="flex size-[18px] items-center justify-center rounded-[5px]"
        style={checked ? { background: "var(--primary)" } : { border: "1.5px solid #C5D4CD" }}
      >
        {checked && <Check className="size-3 text-primary-foreground" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}
