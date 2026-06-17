# ComplianceAI

AI-powered legal & compliance SaaS for Saudi Arabia. See `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` for the full design.

## Structure

```
compliance-ai/
  docs/          PRD, architecture, database design
  frontend/      Next.js 14 + TypeScript + Tailwind + shadcn/ui
  backend/       Django 6 + DRF + PostgreSQL
```

## Local development

### Backend

```
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill in DB + API credentials
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver 8000
```

Requires a local Postgres role/db matching `.env` (`DB_NAME`/`DB_USER`/`DB_PASSWORD`).

### Frontend

```
cd frontend
npm install
cp .env.example .env.local   # fill in Clerk + API base URL
npm run dev
```

## Status

Scaffolded — frontend routes (landing, auth, dashboard, documents, compliance calendar,
AI assistant, settings, billing, admin) render with placeholder data. Backend models,
admin, and REST endpoints exist for all MVP entities (orgs, documents, analyses,
clause findings, generated documents, compliance events, chat, audit log).

**Not yet implemented:**
- Clerk JWT verification (`organizations/authentication.py` — needs JWKS wiring)
- AI Contract Review Engine (`documents` `analyze` action — needs OpenAI + Pinecone)
- RAG legal assistant (`assistant` `ask` action — needs OpenAI + Pinecone)
- Document upload to S3, OCR/text extraction
- PDF/DOCX export for generated documents
- Compliance calendar email reminders
