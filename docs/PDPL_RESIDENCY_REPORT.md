# PDPL Data-Residency Report — ComplianceAI

> **Driver:** Saudi PDPL requires personal/customer data of Saudi data subjects to be
> stored and processed inside the Kingdom (KSA). This report inventories every data
> store and every external processor, states its current region, and the target.
>
> **Target region:** Google Cloud **`me-central2` (Dammam, KSA)**.
> **Decision (Ahmed, 2026-06-29):** keep Django 6 + DRF + PostgreSQL unchanged;
> re-host into GCP `me-central2`. No NoSQL/Firebase migration (Firebase has no KSA region).
>
> Status legend: ✅ in-KSA after re-host · ⚠️ external processor (cross-border transfer) · 🔵 config-only change

---

## 1. Data stores (data at rest)

| # | Store | Holds | Current region | Target (this re-host) | Status |
|---|-------|-------|----------------|------------------------|--------|
| 1 | **Application database** (PostgreSQL) | All org/user records, documents metadata, findings, billing refs, audit logs, RAG chunks + embeddings | Render Postgres (US/EU region) | **Cloud SQL for PostgreSQL, `me-central2`** | 🔵→✅ |
| 2 | **Object storage** (original uploaded documents, OCR inputs) | Contract/legal PDFs, DOCX, scanned images — high-sensitivity PII | AWS S3 (region per `AWS_S3_REGION_NAME`) | **Google Cloud Storage bucket, `me-central2`** | 🔵→✅ |
| 3 | **Database backups / PITR** | Snapshot of (1) | Render-managed (follows DB region) | **Cloud SQL automated backups, pinned to `me-central2`** | ✅ (verify backup region) |
| 4 | **Application logs** | Request/operational logs — **no PII payloads written** (see §3) | Render logs / stdout | **Cloud Logging, `me-central2` log bucket** (pin region; default is `global`) | ⚠️ action needed |
| 5 | **Secrets** (`ANTHROPIC_API_KEY`, `OCR_AZURE_*`, `VOYAGE_API_KEY`, Stripe, Clerk, DB) | Credentials, not data-subject PII | Render env (`sync:false`) | **Google Secret Manager** (or Cloud Run env), region-pinned | 🔵 |

**Residency conclusion for data-at-rest:** after the re-host, stores 1–3 + 5 resolve to
Dammam. **Action item (4):** Cloud Logging defaults to a `global`/US bucket — a
region-pinned `me-central2` log bucket must be configured explicitly, or logs leave KSA.
This is the one data-at-rest gap that the compute/DB/storage moves do **not** fix by themselves.

---

## 2. External processors (data in transit / processed outside KSA)

Re-hosting compute + storage to Dammam fixes data-at-rest. It does **not** fix the fact
that several third parties **receive Saudi personal data and process it outside KSA** —
each is a separate PDPL cross-border transfer requiring a lawful basis (adequacy, BCRs,
SCC-equivalent, or explicit consent) and typically a signed DPA.

| # | Processor | Data it receives | Personal data? | KSA region available? | Disposition | Tracked in |
|---|-----------|------------------|----------------|------------------------|-------------|------------|
| A | **Stripe** (billing) | Customer email, org name, payment metadata | Yes | ❌ No KSA entity; payments are SAMA-regulated | **Replace** with Saudi PSP (highest priority) | Processor memo §1 |
| B | **Voyage AI** (embeddings, US) | Document chunk text → vectors (recoverable PII) | Yes | ❌ | **Replace** with in-region (Vertex AI `me-central2`) | Processor memo §2 |
| C | **Azure Document Intelligence** (OCR) | Scanned/image-only document images (full content) | Yes | ❌ No KSA region | **Add** in-region alt (GCP Document AI `me-central2`); keep Azure selectable | Processor memo §3 |
| D | **Anthropic / Claude** (contract analysis, assistant phrasing) | Document text (`documents/views.py:74`, up to 50k chars) | Yes | ❌ | **Keep + mitigate** (data-minimization, DPA, zero-retention) | Processor memo §4 |
| E | **Clerk** (auth/identity) | User identity, email, session | Yes | ❌ | **Keep + mitigate** (DPA, minimize) | Processor memo §4 |

> Processors A–C are addressed by the evaluation track (replace / add in-region).
> D–E stay for now; mitigation (minimize, DPA, zero-retention, no-PII-logging) is the
> compensating control. All five require a documented cross-border transfer basis —
> a **legal/contracts task for Ahmed + Advisor**, flagged here, not actioned by engineering.

---

## 3. PII-in-logs audit

**Finding: PASS (no PII reaches logs on any external-call path today).**

- The backend defines **no custom `LOGGING` config** and makes **no `logger.*` / `print()`
  calls in business logic** (only a one-off `print` inside a settings *comment* for key
  generation). Verified by grep across `backend/**/*.py` (excluding tests/migrations).
- External-call sites send payloads but do **not** log them:
  - Anthropic — `documents/views.py` / `assistant/views.py`: request body built inline, response parsed; not logged.
  - Azure OCR — `documents/ocr.py`: stdlib `urllib`, no payload logging.
  - Voyage — `assistant/rag.py` `_voyage_embed`: chunk text sent, not logged.
  - Stripe — `billing/services.py`: SDK calls, no PII logged by us.
- Risk going forward: Django's default logging + Cloud Run request logging can capture
  URLs/headers. **Guardrail to keep this PASS:** never log request/response bodies for the
  four external paths; keep PII out of URLs (we use POST bodies, good); pin the Cloud
  Logging bucket to `me-central2` (see §1 item 4).

**Recommendation:** add a short note to `docs/ARCHITECTURE.md` codifying the
"no payload logging on external-call paths" rule so it survives future changes, and add a
lightweight test/CI grep if we ever introduce structured logging.

---

## 4. Residency checklist (acceptance)

- [ ] Compute (Django) runs on Cloud Run in `me-central2` — health endpoint reachable
- [ ] Cloud SQL Postgres in `me-central2`; data migrated; 94-test suite green against it
- [ ] Backups/PITR pinned to `me-central2`
- [ ] GCS bucket in `me-central2`; upload/fetch round-trip tested through the storage interface
- [ ] Secrets in Secret Manager / Cloud Run env (region-appropriate)
- [ ] **Cloud Logging bucket pinned to `me-central2`** (the non-obvious one)
- [ ] Cross-border transfer basis documented for Stripe, Voyage, Azure, Anthropic, Clerk (legal)

---

*Authored by Claude Code for Advisor review. No infrastructure provisioned; no cost incurred.*
*Companion: `docs/PDPL_PROCESSOR_EVALUATION.md`.*
