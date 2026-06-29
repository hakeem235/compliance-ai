"""
S3 document storage — presigned upload/download.

The browser uploads the original file straight to S3 with a short-lived
presigned PUT URL, and views it later with a presigned GET URL. AWS
credentials live only on the server and are never sent to the client.

This layer is INERT until S3 is fully configured (bucket + region + access
key + secret). When it isn't, `storage_enabled()` returns False and callers
return a 503 — there is no synthetic/local fallback in the production path.
"""

import re
import uuid

from django.conf import settings

# boto3 is an approved, pinned dependency. Import lazily-tolerantly so the app
# still boots (and tests unrelated to storage run) even if it's not installed
# in a given environment — storage simply reports itself disabled.
try:
    import boto3
    from botocore.config import Config as BotoConfig
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # pragma: no cover - boto3 is pinned in requirements
    boto3 = None
    BotoConfig = None

    class BotoCoreError(Exception):
        ...

    class ClientError(Exception):
        ...


from . import gcs_storage

# Errors callers can catch without importing botocore directly. Includes the GCS
# path's error so callers stay provider-agnostic (Python flattens nested tuples
# in `except` clauses, so this composes with existing `except` sites).
StorageError = (BotoCoreError, ClientError, gcs_storage.StorageError)


def _active():
    """The active storage provider module. Returns the GCS adapter when
    STORAGE_BACKEND=gcs, else None (this module — the S3 default). Keeps one
    interface for callers while the PDPL re-host swaps the backend by env flag."""
    if getattr(settings, "STORAGE_BACKEND", "s3").lower() == "gcs":
        return gcs_storage
    return None

# Only these content types are accepted for upload, mirroring the supported
# document file types (defense-in-depth alongside the presigned-URL scope).
ALLOWED_CONTENT_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
}


def storage_enabled() -> bool:
    """True only when the active storage backend is fully configured."""
    provider = _active()
    if provider:
        return provider.storage_enabled()
    return bool(
        boto3
        and settings.AWS_STORAGE_BUCKET_NAME
        and settings.AWS_S3_REGION_NAME
        and settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
    )


def _client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        # SigV4 is required for presigned URLs in all current regions.
        config=BotoConfig(signature_version="s3v4"),
    )


def build_object_key(organization_id, filename: str) -> str:
    """A collision-free, org-scoped object key. Org id prefixes every key so
    one tenant's objects can never share a path with another's. The filename
    is sanitized to a safe charset (no separators or dot-runs) for tidiness —
    the uuid segment is what actually guarantees uniqueness and isolation."""
    base = filename or "document"
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", base)  # drop separators/spaces
    safe_name = re.sub(r"\.{2,}", ".", safe_name).strip("._") or "document"
    return f"orgs/{organization_id}/documents/{uuid.uuid4()}/{safe_name}"


def create_upload_url(organization_id, filename: str, content_type: str) -> dict:
    """Presigned PUT URL the browser uses to upload the file directly to S3.

    Returns {url, key, content_type, expires_in}. Raises ValueError on an
    unsupported content type and StorageError on a backend failure.
    """
    provider = _active()
    if provider:
        return provider.create_upload_url(organization_id, filename, content_type)
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Unsupported content type: {content_type}")
    key = build_object_key(organization_id, filename)
    url = _client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=settings.AWS_S3_PRESIGN_EXPIRY,
    )
    return {
        "url": url,
        "key": key,
        "content_type": content_type,
        "expires_in": settings.AWS_S3_PRESIGN_EXPIRY,
    }


def create_download_url(key: str) -> str:
    """Presigned/signed GET URL for viewing/downloading a stored object."""
    provider = _active()
    if provider:
        return provider.create_download_url(key)
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_STORAGE_BUCKET_NAME, "Key": key},
        ExpiresIn=settings.AWS_S3_PRESIGN_EXPIRY,
    )


def fetch_object_bytes(key: str) -> bytes:
    """Read a stored object's bytes server-side (used by the OCR fallback to
    run scanned PDFs through OCR). Raises StorageError on failure."""
    provider = _active()
    if provider:
        return provider.fetch_object_bytes(key)
    response = _client().get_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
    return response["Body"].read()
