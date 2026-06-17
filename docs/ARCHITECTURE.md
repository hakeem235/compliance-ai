# ComplianceAI — System Architecture

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Django + Django REST Framework
- **DB:** PostgreSQL (org-scoped multi-tenant via `organization_id` FK on every table)
- **AI:** OpenAI API (GPT for generation/review, `text-embedding-3` for embeddings) + LangChain orchestration
- **Vector DB:** Pinecone (namespace-per-organization for tenant isolation)
- **File storage:** AWS S3 (private buckets, per-org prefix, SSE-KMS)
- **Auth:** Clerk (handles JWT, MFA, Google OAuth, org/workspace primitives natively — maps directly onto the role model)
- **Deploy:** Docker containers, AWS (ECS Fargate for backend, Vercel or S3+CloudFront for frontend, RDS for Postgres)

## High-Level Flow

```
Browser (Next.js)
   │  Clerk session JWT
   ▼
Django REST API (DRF) ── RBAC middleware (org_id + role from JWT claims)
   │                              │
   ├─→ Postgres (RDS)             ├─→ S3 (document blobs)
   │                              │
   └─→ LangChain orchestrator
           ├─→ OpenAI (GPT: review/generate/chat, embeddings)
           └─→ Pinecone (retrieval: regulation corpus + org's own documents)
```

## RAG Pipeline

1. Ingest: Saudi Labor Law, PDPL, Commercial Regulations, SME guides → chunk → embed → Pinecone namespace `kb-saudi` (shared, read-only across orgs)
2. On upload, user documents are chunked/embedded into Pinecone namespace `org-{id}` (tenant-isolated)
3. Query time: retrieve top-k from both `kb-saudi` and `org-{id}`, pass as context to GPT with a citation-forcing prompt template — every legal claim must reference a retrieved chunk's source doc + section
4. Chat assistant and document analysis both go through this same retrieval layer

## Tenant Isolation

- Postgres: every table has `organization_id`; DRF viewsets filter by request org claim — no cross-org query path exists
- Pinecone: per-org namespace, never queried across namespaces except the shared read-only `kb-saudi`
- S3: per-org key prefix + IAM policy scoped to prefix

## Security Controls

- Clerk-issued JWT validated on every DRF request; role + org_id read from verified claims, never from client-supplied body
- Audit log table: every document access, AI call, and document generation writes an immutable audit row (actor, org, action, timestamp, resource id)
- Rate limiting at API gateway level (per-org and per-user) via DRF throttling classes
- OWASP Top 10: parameterized ORM queries only, CSRF tokens on state-changing requests, strict CSP, input validation on every serializer, dependency scanning in CI (gitleaks already standard per repo governance)

## Future Jurisdiction Expansion

Compliance rules and KB content are stored per-jurisdiction (`jurisdiction` field on rule/document models + separate Pinecone namespace `kb-{jurisdiction}`). Adding UAE/UK/etc. is a content + namespace addition, not a schema or code change.
