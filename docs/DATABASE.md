# ComplianceAI — Database Schema (MVP)

All tables include `organization_id`, `created_at`, `updated_at` unless noted.

```
organizations
  id, name, jurisdiction (default 'SA'), plan, created_at

users
  id, clerk_user_id, organization_id, role (admin|owner|member|legal_reviewer), email, name

documents
  id, organization_id, uploaded_by_user_id, filename, file_type (pdf|docx|txt),
  s3_key, status (uploaded|processing|analyzed|failed), version, parent_document_id (nullable, for version history)

document_analyses
  id, document_id, risk_score (0-100), risk_summary, status, model_version, created_at

clause_findings
  id, document_analysis_id, clause_text, risk_level (high|medium|low),
  category (liability|termination|confidentiality|ip|dispute_resolution|other),
  recommendation, citation_source (nullable FK to kb_sources)

kb_sources
  id, jurisdiction, title, source_type (law|regulation|guide), section_ref, content_excerpt, source_url

generated_documents
  id, organization_id, created_by_user_id, doc_type (nda|employment|freelance|vendor|service|non_compete|warning_letter|termination_letter),
  questionnaire_answers (jsonb), draft_content, exported_pdf_s3_key, exported_docx_s3_key

compliance_events
  id, organization_id, type (license_renewal|contract_expiry|tax_deadline|hr_obligation),
  related_document_id (nullable), due_date, status (upcoming|due|overdue|resolved), notify_emails

chat_sessions
  id, organization_id, user_id, title, created_at

chat_messages
  id, chat_session_id, role (user|assistant), content, citations (jsonb), created_at

audit_logs
  id, organization_id, actor_user_id, action, resource_type, resource_id, metadata (jsonb), created_at
```

## Notes

- `clause_findings.citation_source` enforces the "every recommendation cites a source" PRD requirement at the data layer.
- `audit_logs` is append-only — no update/delete path exposed via API.
- Multi-tenancy enforced by `organization_id` filter in every DRF queryset; no table is exempt.
