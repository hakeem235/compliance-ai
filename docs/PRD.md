# ComplianceAI — Product Requirements Document

## 1. Executive Summary

ComplianceAI is a cloud SaaS platform that helps Saudi-market small businesses, startups, freelancers, and legal/HR/procurement teams review contracts, identify legal risk, track compliance obligations, and generate legally-sound business documents using AI. It is an assistive tool, not a substitute for licensed legal counsel — every output carries that disclaimer.

MVP scope: Saudi Arabia only (Labor Law, Commercial Regulations, PDPL, SME requirements). Architecture is jurisdiction-pluggable so UAE/Bahrain/Kuwait/Qatar/UK/US can be added later without a rewrite.

## 2. Target Users & Roles

Users: small businesses, startups, freelancers, HR departments, procurement teams, legal ops teams, consultants.

Roles (org-scoped RBAC):
- **Admin** — full org control, billing, user management
- **Business Owner** — full document/compliance access within org
- **Team Member** — upload/view documents, limited actions
- **Legal Reviewer** — review queue, approve/annotate AI output

## 3. Feature Breakdown (MVP)

1. **Auth** — email/password, Google OAuth, password reset, MFA, org/workspace model, role assignment (via Clerk)
2. **Dashboard** — recent reviews, compliance alerts, expiring contracts, risk score summary, AI activity log
3. **Document Upload & Analysis** — PDF/DOCX/TXT, drag-drop, OCR (scanned PDFs), text/metadata extraction, version history
4. **AI Contract Review Engine** — clause-by-clause review, risk scoring 0–100, high/medium/low risk tagging, recommendations
5. **Saudi Compliance Module** — rules engine + RAG knowledge base for Labor Law, PDPL, Commercial Regulations, SME rules
6. **AI Document Generator** — questionnaire-driven drafting for 8 document types, PDF/DOCX export
7. **Compliance Calendar** — deadlines (licenses, contract expiry, tax, HR), email + dashboard reminders
8. **AI Legal Assistant (chat)** — RAG-grounded Q&A, clause explanation, document summarization, always cites source

## 4. Non-Functional Requirements

- Security: JWT (via Clerk), RBAC, encryption at rest (S3 SSE) and in transit (TLS), audit log on every document/AI action, rate limiting, OWASP Top 10 mitigations
- Every AI legal recommendation must include a citation to its source regulation/document
- Every page/response carries a "not legal advice" disclaimer
- Accessibility: WCAG AA minimum
- Dark mode, responsive, professional legal-tech visual language

## 5. Out of Scope (MVP)

- Jurisdictions beyond Saudi Arabia (architecture supports, content does not ship)
- E-signature workflow
- Native mobile apps
- Multi-language UI beyond Arabic/English

## 6. Disclaimer Requirement

Every AI-generated risk assessment, recommendation, or document must display: *"ComplianceAI provides AI-assisted guidance and does not constitute legal advice. Consult a licensed attorney for legal decisions."*
