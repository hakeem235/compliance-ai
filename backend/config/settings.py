"""
Django settings for ComplianceAI backend.
"""

import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key-do-not-use-in-prod")

DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]

# Render injects the public hostname at runtime; trust it automatically so the
# host doesn't have to be hard-coded before the service URL is known.
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "organizations",
    "documents",
    "compliance",
    "assistant",
    "audit",
    "billing",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "audit.middleware.AuditLogMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database: prefer a single DATABASE_URL (managed hosts provide this); fall back
# to the discrete DB_* vars for local development.
if os.environ.get("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.config(
            conn_max_age=600,
            ssl_require=not DEBUG,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "complianceai"),
            "USER": os.environ.get("DB_USER", "complianceai"),
            "PASSWORD": os.environ.get("DB_PASSWORD", ""),
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "5432"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# WhiteNoise: compressed, hashed static files served by the app process.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Production security hardening — only active when DEBUG is off, so local dev
# (HTTP) is unaffected. Hosts terminate TLS and forward this header.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    CSRF_TRUSTED_ORIGINS = [
        o.strip()
        for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",")
        if o.strip()
    ]

# CORS — frontend dev origin only; tighten for production via env
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "organizations.authentication.ClerkJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": "120/minute",
        "anon": "20/minute",
    },
}

# Clerk — JWT verification (see organizations/authentication.py)
CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY", "")
CLERK_JWT_ISSUER = os.environ.get("CLERK_JWT_ISSUER", "")
# Optional expected audience. Clerk's default session tokens carry no `aud`
# claim, so audience is only enforced when this is set (e.g. a custom JWT
# template). When set, a token with a missing/wrong `aud` is rejected.
CLERK_JWT_AUDIENCE = os.environ.get("CLERK_JWT_AUDIENCE", "")

# AWS S3 — document storage. Uploads/downloads use short-lived presigned URLs;
# the app holds these credentials, the browser never sees them. Inert until all
# of bucket + region + access key + secret are provided (see documents.storage).
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME", "")
AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
# How long presigned upload/download URLs stay valid (seconds).
AWS_S3_PRESIGN_EXPIRY = int(os.environ.get("AWS_S3_PRESIGN_EXPIRY", "900"))

# OpenAI / Pinecone — AI review, generation, RAG (not yet provisioned)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY", "")
PINECONE_ENVIRONMENT = os.environ.get("PINECONE_ENVIRONMENT", "")

# Anthropic — AI Legal Assistant (direct model call, no retrieval/RAG pipeline yet)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
# Model name is a non-secret, env-configurable setting so it can be upgraded
# without a code change. Defaults to the contract-review model.
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")

# Voyage AI — embeddings for the RAG legal assistant. The credential-free
# deterministic placeholder embedder stays the default; Voyage activates only
# when VOYAGE_API_KEY is set (see assistant/rag.py). Called via stdlib REST.
VOYAGE_API_KEY = os.environ.get("VOYAGE_API_KEY", "")
VOYAGE_MODEL = os.environ.get("VOYAGE_MODEL", "voyage-3")

# Fernet key used to encrypt per-org SMTP passwords at rest. In dev this falls
# back to a key derived from SECRET_KEY (see compliance/crypto.py); production
# MUST set a dedicated key: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
EMAIL_CONFIG_ENCRYPTION_KEY = os.environ.get("EMAIL_CONFIG_ENCRYPTION_KEY", "")

# How many days ahead of a due date a reminder email is sent.
COMPLIANCE_REMINDER_WINDOW_DAYS = int(os.environ.get("COMPLIANCE_REMINDER_WINDOW_DAYS", "7"))

# Stripe — subscription billing. Keys/price IDs are per-environment; without
# them the billing endpoints return a clear "not configured" error rather than
# crashing. STRIPE_PRICE_IDS maps internal plan keys → Stripe price IDs.
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_IDS = {
    "starter": os.environ.get("STRIPE_PRICE_STARTER", ""),
    "growth": os.environ.get("STRIPE_PRICE_GROWTH", ""),
}
# Where Stripe redirects after Checkout / billing portal (frontend billing page).
STRIPE_BILLING_RETURN_URL = os.environ.get("STRIPE_BILLING_RETURN_URL", "http://localhost:3000/billing")
