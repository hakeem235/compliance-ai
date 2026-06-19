/**
 * Canonical Saudi regulatory citations, sourced from
 * Saudi_Arabia_Governance_Compliance.md. Used to ground contract-review
 * findings and AI assistant answers in real regulations instead of
 * generic placeholder text.
 */
export const REGULATIONS = {
  companiesLaw: "Saudi Companies Law (effective Jan 2023)",
  cgrChairCeo: "Corporate Governance Regulations (CGR) — chair/CEO separation",
  cgrInternalAudit: "Corporate Governance Regulations (CGR), Arts. 73–75 — Internal Audit Unit",
  cgrIndependentDirectors: "Corporate Governance Regulations (CGR) — independent director criteria",
  capitalMarketLaw: "Capital Market Law, Royal Decree No. M/30",
  vatImplementingRegs: "ZATCA VAT Implementing Regulations (amended April 2025)",
  withholdingTax: "ZATCA Withholding Tax Regulations",
  fatooraPhase2: "ZATCA E-Invoicing (FATOORA) Phase 2 Requirements",
  beneficialOwnerRules: "Beneficial Owner Rules (effective Dec 2025)",
  pdpl: "Personal Data Protection Law (PDPL)",
  ifrsS1: "IFRS S1 — General Sustainability-related Disclosures",
  ifrsS2: "IFRS S2 — Climate-related Disclosures",
} as const;
