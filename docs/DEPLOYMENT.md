# ComplianceAI — Deployment Plan

> Status: Phase A in progress. Phases B–E pending decisions (see "Open decisions").

ComplianceAI is **two deployables**: a Next.js frontend (Vercel) and a Django +
Postgres backend (a backend host such as Render/Railway/Fly). Vercel hosts only
the frontend; the backend cannot run on Vercel as a stateful Django app.

```
[ Vercel ]  Next.js frontend  ──API──>  [ Render/Railway ]  Django (gunicorn)
   Clerk (prod)                              │
                                        [ Managed Postgres ]
                                        Stripe webhook ──> /api/billing/webhook/
```

## Phase A — Backend prod-readiness (code, this PR)
1. Add pinned prod deps: `gunicorn`, `whitenoise`, `dj-database-url`.
2. `settings.py`: support `DATABASE_URL` via `dj-database-url` (falls back to the
   existing discrete `DB_*` vars); add WhiteNoise middleware + `STATIC_ROOT`;
   add production security hardening (HTTPS redirect, secure cookies, HSTS) that
   activates only when `DJANGO_DEBUG=false`.
3. Add `Procfile` (`web: gunicorn config.wsgi`) and a `release` step running
   `migrate` + `collectstatic`.
4. Add CI workflow (gitleaks + lint + build) per governance.
5. Update `.env.example` with `DATABASE_URL`.

## Phase B — Backend hosting (needs decision: Render / Railway / Fly)
- Provision managed Postgres; set env/secrets; first deploy runs migrations.
- Capture the public backend URL (e.g. `https://complianceai-api.onrender.com`).

## Phase C — Stripe
- Register a dashboard webhook → `<backend>/api/billing/webhook/`; capture the
  persistent `whsec_` (replaces the session-scoped `stripe listen` forwarder).
- Decide test vs live mode for this deploy.

## Phase D — Frontend on Vercel
- Import repo, root dir `frontend/`, framework Next.js.
- Env: `NEXT_PUBLIC_API_BASE_URL=<backend URL>`,
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (prod).

## Phase E — Wire-up & verify
- Backend `CORS_ALLOWED_ORIGINS` + `STRIPE_BILLING_RETURN_URL` ← Vercel URL.
- Clerk prod instance: add the Vercel domain to allowed origins.
- Smoke test: sign-in, document analysis, billing checkout, webhook 200.

## Secrets (host env only — never committed)
`DJANGO_SECRET_KEY`, `DATABASE_URL`, `DJANGO_ALLOWED_HOSTS`,
`CORS_ALLOWED_ORIGINS`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER/GROWTH`,
`STRIPE_BILLING_RETURN_URL`, `EMAIL_CONFIG_ENCRYPTION_KEY`, plus optional
`OPENAI_*` / `PINECONE_*` / `ANTHROPIC_API_KEY` / `AWS_*` if those features are on.

## Open decisions (for Advisor)
1. Backend host: Render vs Railway vs Fly?
2. Stripe mode: test or live for this deploy?
3. Which optional integrations (OpenAI/Pinecone/Anthropic/S3) must be live vs deferred?
4. Custom domain, or default host/Vercel subdomains for now?
