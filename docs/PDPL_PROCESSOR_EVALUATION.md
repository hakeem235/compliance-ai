# PDPL Processor Evaluation Memo — ComplianceAI

> Per Advisor directive 2026-06-29 11:40. Re-hosting to Dammam fixes data-at-rest;
> each external processor is a separate cross-border transfer of Saudi personal data.
> This memo gives a per-processor recommendation, the in-KSA option, an effort estimate,
> and what removing each hop buys for PDPL.
>
> **This is evaluation + scaffolding only.** No working integration is removed; nothing
> that incurs cost or needs a new credential is provisioned without a Question. All
> in-region providers land **gated/inert behind their existing abstractions**, default
> unchanged, until Ahmed flips them on.

---

## 1. Payments — Stripe → Saudi PSP  *(highest priority, longest lead)*

**Problem:** Stripe has no KSA entity; Saudi payment processing is SAMA-regulated.
Customer email + payment metadata leave KSA on every billing call.

**Current integration:** isolated in `backend/billing/services.py` (the only module that
imports `stripe`): `create_checkout_session`, `create_portal_session`, `verify_webhook`,
`apply_subscription_event`, customer/subscription sync. Views never import Stripe directly.
This is already a clean swap boundary.

**Candidates (in-Kingdom, SAMA-aligned):**

| PSP | Recurring/subscriptions | Webhooks | Sandbox | API maturity | Fees (indicative) | Notes |
|-----|--------------------------|----------|---------|--------------|-------------------|-------|
| **Moyasar** | Tokenized cards + recurring via saved tokens; no native "Subscription" object — we drive the cycle | Yes | Yes | Clean REST, good docs, mada + Apple Pay | ~2.75% + fee | **Recommended.** Best DX/docs; closest to a drop-in for our thin billing layer. |
| **HyperPay** | Recurring via registration tokens / scheduler | Yes | Yes | Enterprise, heavier integration (COPYandPAY) | Negotiated | Strong enterprise option; more setup surface. |
| **PayTabs** | Recurring profiles supported | Yes | Yes | Broad MENA, decent REST | Published tiers | Viable; docs less crisp than Moyasar. |

**Recommendation: Moyasar**, with HyperPay as the enterprise fallback. None offers a 1:1
Stripe "Subscription" object — our `Subscription` model already stores period/state, so we
own the renewal cycle and treat the PSP as charge + token + webhook.

**Migration plan (NOT implemented — Ahmed decides):**
1. Extract a `BillingProvider` protocol from `billing/services.py`
   (`create_checkout`, `create_portal`/managed-card-update, `verify_webhook`, `sync_event`).
2. Keep `StripeProvider` as the current impl; add `MoyasarProvider` behind a
   `BILLING_PROVIDER` env flag (default `stripe`), gated/inert until `MOYASAR_*` keys set.
3. Map plan catalog (`billing/plans.py`) to PSP amounts; drive recurring via stored tokens + a scheduled charge.
4. New webhook endpoint + signature verify; reconcile to the existing `Subscription` row.
5. Data migration: existing Stripe customers can't transfer tokens cross-PSP → re-collect
   payment method on next cycle (communications task for Ahmed).

**Effort:** ~4–6 dev-days for the abstraction + Moyasar provider + webhook + tests, inert.
Cutover (token re-collection, plan mapping, go-live) is a separate, Ahmed-gated step.
**PDPL win:** removes the largest recurring cross-border transfer of payment PII; brings billing under SAMA-aligned in-Kingdom processing.

---

## 2. Embeddings — Voyage AI (US) → in-Kingdom

**Problem:** Voyage embeds document chunk text; embeddings are recoverable PII leaving KSA.

**Current integration:** `backend/assistant/rag.py` — `active_embedder()` already chooses
between the deterministic placeholder (default, credential-free) and Voyage. Clean seam.

**Recommendation: Vertex AI text-embeddings in `me-central2`** (`text-embedding-005` /
multilingual) as a third option behind `active_embedder()`. Self-hosted sentence-transformers
on the Dammam compute is the no-credential fallback (heavier image, lower quality).

**Plan:** add `_vertex_embed()` + `vertex_enabled()` gated on `VERTEX_*` env, called via
REST (consistent with Voyage), default stays placeholder. **Switching providers changes the
vector space → corpus must be re-seeded** (`seed_synthetic_corpus`) — same caveat as Voyage.
Keep the `# TODO(pgvector)` native-store swap independent of provider choice.

**Effort:** ~1–2 dev-days, inert. **PDPL win:** embedding generation stays in `me-central2`;
no document-derived vectors leave KSA.

---

## 3. OCR — Azure Document Intelligence → in-Kingdom fallback

**Problem:** Azure has no KSA region; scanned document images (full content) leave KSA.

**Current integration:** `backend/documents/ocr.py` — fallback-only (text-layer extracts
client-side; only image-only/scanned PDFs hit OCR), gated on `OCR_AZURE_*`, stdlib REST.

**Recommendation: GCP Document AI in `me-central2`** as a selectable, region-pinned provider
(Arabic supported via the OCR/Document processors), behind the existing OCR gate. Keep Azure
as-is/selectable for now via an `OCR_PROVIDER` flag (default current behavior).

**Plan:** add `_gcp_docai_ocr()` + `gcp_ocr_enabled()` gated on `OCR_GCP_*` env; same NUL/
control-char sanitization on output; same fallback-only routing. Unit-test routing with the
provider mocked so CI never needs the credential.

**Effort:** ~1–2 dev-days, inert. **PDPL win:** scanned-document OCR stays in `me-central2`.

---

## 4. Anthropic (Claude) & Clerk — keep, but mitigate

Neither has a KSA region; both stay (core to the product). Mitigation is the compensating control.

**(a) Data-minimization plan (Anthropic):**
- Today `documents/views.py:74` sends raw document text (up to 50k chars) to the Messages API.
- Minimize: strip/redact direct identifiers not needed for legal analysis **before** the call —
  national IDs, IBANs/account numbers, phone/email, personal names where the clause analysis
  doesn't require them — via a redaction pass, with a reversible map kept server-side (in KSA)
  if re-insertion into findings is needed. Send the minimum text necessary.
- Assistant phrasing path: figures/citations are computed server-side; send only the phrasing
  prompt, not raw ledgers/PII.

**(b) No-PII-logging confirmation:** audited — see Residency Report §3. **PASS** today
(no payload logging on the Anthropic/Clerk/Voyage/Azure/Stripe paths). Guardrail documented.

**(c) DPA / zero-retention integration points to flag (Ahmed/Advisor handle contracts):**
- **Anthropic:** sign DPA; request **zero-retention / no-training** on the API account; the
  integration point is the single Messages call in `documents/views.py` + `assistant/views.py`.
- **Clerk:** DPA + confirm data-region/processing terms; integration point is the JWT/identity layer.
- **Each replaced/added processor** (Moyasar, Vertex, GCP Document AI) needs its own DPA at activation.

**Effort:** redaction pass ~1–2 dev-days (gated, opt-in via `ANTHROPIC_REDACT_PII`); logging
guardrail ~0.5 day (doc + optional CI grep). DPAs are non-engineering.
**PDPL win:** minimizes what crosses the border on the two processors we keep, and pins down where contractual safeguards attach.

---

## 5. Summary & sequencing

| # | Processor | Recommendation | In-KSA option | Effort (inert scaffold) | Credential needed |
|---|-----------|----------------|---------------|--------------------------|-------------------|
| 1 | Stripe | Replace → **Moyasar** | Moyasar (SAMA) | 4–6 d (plan only now) | `MOYASAR_*` (later) |
| 2 | Voyage | Replace → **Vertex AI** | Vertex `me-central2` | 1–2 d | `VERTEX_*` (later) |
| 3 | Azure OCR | Add → **GCP Document AI** | Doc AI `me-central2` | 1–2 d | `OCR_GCP_*` (later) |
| 4a | Anthropic | Keep + minimize + DPA | n/a (mitigate) | 1–2 d redaction | none new |
| 4b | Clerk | Keep + DPA | n/a (mitigate) | 0 | none new |

**Proposed build order (after this memo + the residency report land):** scaffold the three
abstractions inert (Vertex embeddings, GCP Document AI, billing-provider seam + Moyasar stub),
then the GCS storage adapter + GCP IaC for the re-host itself. **Each new credential gets an
FYI before it goes live; nothing is provisioned without a Question.** Stripe stays until Ahmed
approves the PSP and the cutover plan.

---

*Authored by Claude Code for Advisor review. No integration removed; nothing provisioned.*
