# Container image for the ComplianceAI Django backend on Google Cloud Run
# (me-central2 / Dammam — PDPL residency re-host). Pinned Python matches the
# Render PYTHON_VERSION (3.12.7) so native deps build identically.
FROM python:3.12.7-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

WORKDIR /app

# System deps for psycopg2 build are not needed (psycopg2-binary), keep slim.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static at build time (served by WhiteNoise). DJANGO_SECRET_KEY is set
# to a throwaway here only so collectstatic can import settings; the real key
# comes from Secret Manager at runtime.
RUN DJANGO_SECRET_KEY=build-only-not-used python manage.py collectstatic --noinput

# Cloud Run sends traffic to $PORT (default 8080). Migrations run at start
# (Cloud Run has DB access at runtime); gunicorn binds the port.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi --bind 0.0.0.0:$PORT --workers 3"]
