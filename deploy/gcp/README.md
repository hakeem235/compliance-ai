# ComplianceAI — GCP `me-central2` (Dammam) Deploy Runbook

PDPL data-residency re-host. Replaces `render.yaml`. Keeps the Django 6 + DRF +
PostgreSQL backend unchanged — this is **infra + storage-adapter config only**,
no business-logic rewrite.

> **Nothing here is provisioned.** Every step below incurs cost or needs a
> credential — run only after the Advisor/Ahmed approve provisioning. The app
> code ships inert: `STORAGE_BACKEND`/`OCR_PROVIDER`/`VERTEX_*`/`BILLING_PROVIDER`
> all default to the existing providers until these env values are set.

## Target architecture (all in `me-central2`)

| Concern | Service | Notes |
|---------|---------|-------|
| Compute | **Cloud Run** `complianceai-api` | container from `backend/Dockerfile`; `/api/health/` probe |
| Database | **Cloud SQL for PostgreSQL** `complianceai-db` | private IP; migrate off Render Postgres |
| Object storage | **GCS bucket** | `STORAGE_BACKEND=gcs` → `documents/gcs_storage.py`, V4 signed URLs |
| OCR (fallback) | **Document AI** | `OCR_PROVIDER=gcp`, Arabic-capable, in-Kingdom |
| Embeddings | **Vertex AI** | behind `active_embedder()`, `VERTEX_*` |
| Secrets | **Secret Manager** | bound to Cloud Run; never in git |
| Logs | **Cloud Logging** | **pin the `_Default` bucket to `me-central2`** (see below) |

## Provisioning steps (one-time, per project)

```bash
PROJECT_ID=<your-project>; REGION=me-central2
gcloud config set project "$PROJECT_ID"

# 1. APIs
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  storage.googleapis.com secretmanager.googleapis.com documentai.googleapis.com \
  aiplatform.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# 2. Artifact Registry (images)
gcloud artifacts repositories create complianceai --repository-format=docker --location="$REGION"

# 3. Cloud SQL Postgres IN-REGION  (verify location reads me-central2!)
gcloud sql instances create complianceai-db --database-version=POSTGRES_16 \
  --region="$REGION" --tier=db-custom-1-3840 --storage-auto-increase
gcloud sql databases create complianceai --instance=complianceai-db
#   then create a user + build the DATABASE_URL secret (step 6)

# 4. GCS bucket IN-REGION (uniform access; private)
gsutil mb -l "$REGION" -b on "gs://$PROJECT_ID-complianceai-docs"

# 5. Runtime + signing service accounts
gcloud iam service-accounts create complianceai-run    # Cloud Run identity
gcloud iam service-accounts create complianceai-signer # GCS V4 URL signing
#   grant: run SA -> roles/cloudsql.client, secretmanager.secretAccessor,
#          documentai.apiUser, aiplatform.user; signer SA -> storage.objectAdmin
#          on the bucket. Generate a JSON key for the signer -> gcs-sa-key secret.

# 6. Secrets (values from .env / providers — NEVER committed)
for s in django-secret database-url clerk-secret clerk-issuer anthropic-key \
         email-fernet gcs-bucket gcs-sa-email gcs-sa-key stripe-secret \
         stripe-webhook stripe-return-url cors-origins csrf-origins; do
  gcloud secrets create "$s" --replication-policy=automatic 2>/dev/null || true
done
# printf '%s' "<value>" | gcloud secrets versions add <name> --data-file=-
```

## Cloud Logging residency (the non-obvious one)

Cloud Logging defaults to a **global/US** `_Default` bucket — logs would leave KSA.
Pin a regional bucket so log data-at-rest stays in Dammam:

```bash
gcloud logging buckets update _Default --location=global --locked  # if already global, recreate:
gcloud logging buckets create me-central2-default --location=me-central2
gcloud logging sinks create to-ksa-bucket \
  logging.googleapis.com/projects/$PROJECT_ID/locations/me-central2/buckets/me-central2-default \
  --log-filter='resource.type="cloud_run_revision"'
```
> Region for a logging bucket cannot be changed after creation — create the
> `me-central2` bucket up front and route the sink to it.

## Deploy

```bash
gcloud builds submit --config deploy/gcp/cloudbuild.yaml \
  --substitutions=_REGION=me-central2,_CLOUDSQL=$PROJECT_ID:me-central2:complianceai-db
# or declaratively:  gcloud run services replace deploy/gcp/service.yaml --region=me-central2
```

## Data migration (Render Postgres → Cloud SQL)

```bash
pg_dump "$RENDER_DATABASE_URL" --no-owner --no-privileges -Fc -f compliance.dump
# load via Cloud SQL import (through a GCS staging object) or:
pg_restore --no-owner --no-privileges -d "$CLOUDSQL_URL" compliance.dump
```
Then run the existing suite against the new DB config: `python manage.py migrate`
+ `python manage.py test` (94 tests) must pass before cutover.

## Residency verification checklist

- [ ] `gcloud sql instances describe complianceai-db --format='value(region)'` → `me-central2`
- [ ] `gsutil ls -Lb gs://$PROJECT_ID-complianceai-docs | grep -i location` → `ME-CENTRAL2`
- [ ] Cloud Run revision region → `me-central2`
- [ ] Logging bucket location → `me-central2`
- [ ] Cloud SQL automated backups region → `me-central2`
- [ ] Health: `curl https://<run-url>/api/health/` → 200
- [ ] GCS round-trip: upload via signed PUT, fetch via signed GET (storage interface)

External processors that still leave KSA (cross-border transfer, legal review):
Anthropic, Clerk, Stripe (until Moyasar), Azure OCR / Voyage (until GCP Document AI
/ Vertex are flipped on). See `docs/PDPL_RESIDENCY_REPORT.md` + `docs/PDPL_PROCESSOR_EVALUATION.md`.
