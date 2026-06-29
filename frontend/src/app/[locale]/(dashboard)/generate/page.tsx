"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth";
import { ArrowLeft, Check, FileDown, FileText, Printer, AlertTriangle, Loader2 } from "lucide-react";
import { api, ApiError, type GeneratedDocType } from "@/lib/api";

const TEMPLATE_KEYS: { key: string; docType: GeneratedDocType; bg: string; color: string }[] = [
  { key: "nda", docType: "nda", bg: "bg-risk-low-bg", color: "var(--risk-low)" },
  { key: "employment", docType: "employment", bg: "bg-[#EEF3FF]", color: "#2A6FDB" },
  { key: "freelance", docType: "freelance", bg: "bg-[#F3EEFF]", color: "#7C5CFF" },
  { key: "vendor", docType: "vendor", bg: "bg-risk-medium-bg", color: "var(--risk-medium)" },
  { key: "service", docType: "service", bg: "bg-risk-low-bg", color: "var(--risk-low)" },
  { key: "nonCompete", docType: "non_compete", bg: "bg-risk-high-bg", color: "var(--risk-high)" },
  { key: "warningLetter", docType: "warning_letter", bg: "bg-risk-medium-bg", color: "var(--risk-medium)" },
  { key: "terminationLetter", docType: "termination_letter", bg: "bg-risk-high-bg", color: "var(--risk-high)" },
];

const STEP_KEYS = ["0", "1", "2"] as const;

export default function GeneratePage() {
  const t = useTranslations("Generate");
  const { getToken } = useAuth();
  const [template, setTemplate] = useState<(typeof TEMPLATE_KEYS)[number] | null>(null);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenFn = useCallback(() => getToken(), [getToken]);
  const previewRef = useRef<HTMLDivElement>(null);

  function updateAnswer(key: string, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function exportDocx() {
    if (!template || !previewRef.current) return;
    const title = t(`preview.${template.key}.documentTitle`);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title}</title></head><body>${previewRef.current.innerHTML}</body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    window.print();
  }

  async function finishAndPersist() {
    if (!template) return;
    setSaving(true);
    setError(null);
    try {
      await api.generatedDocuments.create({ doc_type: template.docType, questionnaire_answers: answers }, tokenFn);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("step3.errorSave"));
    } finally {
      setSaving(false);
    }
  }

  if (!template) {
    return (
      <div className="mx-auto max-w-[1080px] px-7 py-[26px] pb-10">
        <div className="mb-[18px]">
          <div className="text-[15px] font-bold">{t("chooseTemplate")}</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {t("chooseTemplateDesc")}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3.5">
          {TEMPLATE_KEYS.map((tpl) => (
            <button
              key={tpl.key}
              onClick={() => {
                setTemplate(tpl);
                setStep(1);
                setAnswers({});
                setSaved(false);
                setError(null);
              }}
              className="rounded-[14px] border border-border bg-card p-[18px] text-start transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
            >
              <div className={`mb-3 flex size-[38px] items-center justify-center rounded-[10px] ${tpl.bg}`}>
                <FileText className="size-[19px]" style={{ color: tpl.color }} strokeWidth={1.7} />
              </div>
              <div className="text-[13.5px] font-bold">{t(`templates.${tpl.key}.name`)}</div>
              <div className="mt-0.5 text-[11.5px] leading-[1.4] text-muted-foreground">{t(`templates.${tpl.key}.desc`)}</div>
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
          {t("allTemplates")}
        </button>
        <div className="text-[17px] font-bold tracking-tight">{t(`templates.${template.key}.name`)}</div>

        {/* steps indicator */}
        <div className="my-5 flex items-center">
          {STEP_KEYS.map((key, i) => {
            const n = i + 1;
            const done = step >= n;
            const label = t(`stepLabels.${key}`);
            return (
              <div key={key} className="flex items-center">
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
            <TextField
              label={t(`templates.${template.key}.partyALabel`)}
              defaultValue={t("defaults.disclosingParty")}
              onChange={(v) => updateAnswer("disclosing_party", v)}
            />
            <TextField
              label={t(`templates.${template.key}.partyBLabel`)}
              placeholder={t(`templates.${template.key}.partyBPlaceholder`)}
              onChange={(v) => updateAnswer("receiving_party", v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField label={t("step1.crNumber")} placeholder={t("defaults.crNumberPlaceholder")} onChange={(v) => updateAnswer("cr_number", v)} />
              <TextField label={t("step1.city")} defaultValue={t("defaults.city")} onChange={(v) => updateAnswer("city", v)} />
            </div>
            <div className="rounded-[11px] border border-[#DCEFE6] bg-[#F4FAF7] p-[12px_14px] text-[11.5px] leading-[1.4] text-secondary-foreground/80">
              <b>{t("step1.bilingualTitle")}</b> {t("step1.bilingualDesc")}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground/80">{t("step2.purpose")}</label>
              <textarea
                defaultValue={t("defaults.purpose")}
                onChange={(e) => updateAnswer("purpose", e.target.value)}
                className="h-[78px] w-full resize-none rounded-[10px] border border-border p-3 text-[13px] outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label={t("step2.confidentialityTerm")} defaultValue={t("defaults.confidentialityTerm")} onChange={(v) => updateAnswer("confidentiality_term", v)} />
              <TextField label={t("step2.governingLaw")} defaultValue={t("defaults.governingLaw")} onChange={(v) => updateAnswer("governing_law", v)} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-secondary-foreground/80">{t("step2.includeClauses")}</label>
              <div className="flex flex-col gap-2">
                <CheckRow label={t("step2.returnMaterials")} checked />
                <CheckRow label={t("step2.disputeResolution")} checked />
                <CheckRow label={t("step2.nonSolicitation")} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3.5">
            <div className="rounded-xl border border-[#D7EEE3] bg-risk-low-bg p-[14px_16px]">
              <div className="mb-1 flex items-center gap-2">
                <Check className="size-4 text-accent" strokeWidth={2.4} />
                <span className="text-[13px] font-bold text-primary">{t("step3.draftReady")}</span>
              </div>
              <div className="text-xs leading-[1.5] text-secondary-foreground/80">
                {t("step3.draftReadyDesc", { docName: t(`templates.${template.key}.name`) })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {(["0", "1", "2"] as const).map((key) => (
                <div key={key} className="flex items-center gap-2 text-[12.5px] text-secondary-foreground/80">
                  <Check className="size-3.5 text-accent" strokeWidth={2.2} />
                  {t(`step3.checklist.${key}`)}
                </div>
              ))}
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-[10px] border border-[#F8DADA] bg-[#FDF5F5] px-3.5 py-2.5 text-[12.5px] text-risk-high">
                <AlertTriangle className="size-3.5 flex-none" strokeWidth={1.8} />
                {error}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-2 rounded-[10px] border border-[#D7EEE3] bg-risk-low-bg px-3.5 py-2.5 text-[12.5px] text-primary">
                <Check className="size-3.5 flex-none" strokeWidth={2} />
                {t("step3.savedNotice")}
              </div>
            )}
            <div className="mt-1 flex gap-2.5">
              <button
                onClick={finishAndPersist}
                disabled={saving || saved}
                className="flex h-[42px] flex-1 items-center justify-center gap-[7px] rounded-[10px] bg-primary text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38] disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-[15px] animate-spin" strokeWidth={1.8} /> : <FileDown className="size-[15px]" strokeWidth={1.8} />}
                {saved ? t("step3.saved") : t("step3.saveDraft")}
              </button>
              <button
                onClick={exportDocx}
                className="flex h-[42px] flex-1 items-center justify-center gap-[7px] rounded-[10px] border border-border bg-card text-[13px] font-semibold text-secondary-foreground transition-colors hover:border-accent"
              >
                <FileDown className="size-[15px]" strokeWidth={1.8} />
                {t("step3.exportDocx")}
              </button>
              <button
                onClick={exportPdf}
                className="flex h-[42px] flex-1 items-center justify-center gap-[7px] rounded-[10px] border border-border bg-card text-[13px] font-semibold text-secondary-foreground transition-colors hover:border-accent"
              >
                <Printer className="size-[15px]" strokeWidth={1.8} />
                {t("step3.exportPdf")}
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
            {t("back")}
          </button>
          <div className="flex-1" />
          {step < 3 && (
            <button
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              className="h-10 rounded-[10px] bg-accent px-[22px] text-[13px] font-semibold text-accent-foreground transition-colors hover:bg-[#1A7A50]"
            >
              {t("continue")}
            </button>
          )}
        </div>
      </div>

      {/* live preview */}
      <div className="ca-scroll overflow-y-auto bg-muted/40 p-6">
        <div
          ref={previewRef}
          id="doc-preview-print"
          className="mx-auto max-w-[480px] rounded-md bg-white p-[46px_44px] shadow-lg"
          style={{ minHeight: 600 }}
        >
          <div className="mb-[26px] text-center">
            <div className="text-base font-bold tracking-wide text-[#10201A]">{t(`preview.${template.key}.documentTitle`)}</div>
            <div className="mt-1.5 text-[11px] text-[#9AA8A2]" dir="rtl">
              {t(`preview.${template.key}.documentTitleAr`)}
            </div>
          </div>
          <div className="text-[11.5px] leading-[1.85] text-[#3A4A44]" style={{ fontFamily: "Georgia, serif" }}>
            <p className="mb-3.5">
              {t(`preview.${template.key}.intro`, {
                city: (answers.city as string) || t("defaults.city"),
                partyA: (answers.disclosing_party as string) || t("step1.partyAFallback"),
                partyB: (answers.receiving_party as string) || t(`preview.${template.key}.partyBSignature`),
              })}
            </p>
            <p className="mb-1 font-bold">{t(`preview.${template.key}.section1Title`)}</p>
            <p className="mb-3.5">{t(`preview.${template.key}.section1Body`)}</p>
            <p className="mb-1 font-bold">{t(`preview.${template.key}.section2Title`)}</p>
            <p className="mb-3.5">{t(`preview.${template.key}.section2Body`)}</p>
            <p className="mb-1 font-bold">{t(`preview.${template.key}.section3Title`)}</p>
            <p className="mb-3.5">{t(`preview.${template.key}.section3Body`)}</p>
            <p className="mb-1 font-bold">{t(`preview.${template.key}.section4Title`)}</p>
            <p className="mb-2">{t(`preview.${template.key}.section4Body`)}</p>
          </div>
          <div className="mt-[30px] flex justify-between">
            <div className="w-[42%] border-t border-[#D6DEDA] pt-1.5 text-[10px] text-[#9AA8A2]">{t(`preview.${template.key}.partyASignature`)}</div>
            <div className="w-[42%] border-t border-[#D6DEDA] pt-1.5 text-[10px] text-[#9AA8A2]">{t(`preview.${template.key}.partyBSignature`)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  defaultValue,
  placeholder,
  onChange,
}: {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground/80">{label}</label>
      <input
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
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
