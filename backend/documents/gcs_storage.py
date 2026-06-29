"""
Google Cloud Storage document storage — in-Kingdom (PDPL residency).

A drop-in alternative to `documents.storage` (AWS S3) for the KSA re-host. The
bucket lives in me-central2 (Dammam); the browser uploads straight to GCS with a
short-lived V4 signed PUT URL and views later with a signed GET URL. The service
account key lives only on the server and is never sent to the client — same
contract as the S3 path.

Selected by `STORAGE_BACKEND=gcs`. INERT until the bucket + signing service
account (email + private key) are all configured; otherwise `storage_enabled()`
returns False and callers 503, exactly like the S3 path. No synthetic fallback.

Signing uses RS256 over the documented GCS V4 algorithm via the already-pinned
`cryptography` library — no new dependency, and no SDK (consistent with how the
rest of the app calls external services over stdlib).
"""

import datetime
import hashlib
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

# `cryptography` is already a pinned dependency (Clerk JWT). Import tolerantly so
# the app still boots if it's somehow absent — storage simply reports disabled.
try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
except ImportError:  # pragma: no cover - cryptography is pinned in requirements
    serialization = None


class StorageError(Exception):
    """Raised on a GCS signing/transfer failure (mirrors storage.StorageError)."""


# Mirror the S3 path's content-type allowlist (defense in depth).
ALLOWED_CONTENT_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
}

_HOST = "storage.googleapis.com"


def storage_enabled() -> bool:
    """True only when the GCS bucket and signing service account are configured."""
    return bool(
        serialization
        and settings.GCS_BUCKET_NAME
        and settings.GCS_SA_EMAIL
        and settings.GCS_SA_PRIVATE_KEY
    )


def build_object_key(organization_id, filename: str) -> str:
    """Reuse the S3 path's org-scoped, collision-free key scheme verbatim so the
    object layout is identical across providers (one tenant per path prefix)."""
    from . import storage

    return storage.build_object_key(organization_id, filename)


def _private_key():
    return serialization.load_pem_private_key(
        settings.GCS_SA_PRIVATE_KEY.encode("utf-8"), password=None
    )


def _sign(string_to_sign: str) -> str:
    signature = _private_key().sign(
        string_to_sign.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256()
    )
    return signature.hex()


def _signed_url(method: str, key: str, *, content_type: str | None = None) -> str:
    """Build a GCS V4 signed URL for `method` on object `key`.

    Follows the documented GOOG4-RSA-SHA256 canonical-request algorithm. Headers
    signed are the minimum: host (+ content-type for PUT, so the upload's type is
    bound into the signature, mirroring the S3 presign).
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    timestamp = now.strftime("%Y%m%dT%H%M%SZ")
    datestamp = now.strftime("%Y%m%d")

    credential_scope = f"{datestamp}/{settings.GCS_LOCATION}/storage/goog4_request"
    credential = f"{settings.GCS_SA_EMAIL}/{credential_scope}"

    signed_headers_map = {"host": _HOST}
    if content_type:
        signed_headers_map["content-type"] = content_type
    signed_headers = ";".join(sorted(signed_headers_map))

    query = {
        "X-Goog-Algorithm": "GOOG4-RSA-SHA256",
        "X-Goog-Credential": credential,
        "X-Goog-Date": timestamp,
        "X-Goog-Expires": str(settings.GCS_SIGN_EXPIRY),
        "X-Goog-SignedHeaders": signed_headers,
    }
    canonical_query = "&".join(
        f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
        for k, v in sorted(query.items())
    )

    canonical_uri = "/" + urllib.parse.quote(
        f"{settings.GCS_BUCKET_NAME}/{key}", safe="/"
    )
    canonical_headers = "".join(f"{h}:{v}\n" for h, v in sorted(signed_headers_map.items()))
    canonical_request = "\n".join(
        [method, canonical_uri, canonical_query, canonical_headers, signed_headers, "UNSIGNED-PAYLOAD"]
    )
    request_hash = hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()
    string_to_sign = "\n".join(
        ["GOOG4-RSA-SHA256", timestamp, credential_scope, request_hash]
    )
    signature = _sign(string_to_sign)
    return f"https://{_HOST}{canonical_uri}?{canonical_query}&X-Goog-Signature={signature}"


def create_upload_url(organization_id, filename: str, content_type: str) -> dict:
    """Signed PUT URL the browser uses to upload directly to GCS. Returns the same
    shape as the S3 path: {url, key, content_type, expires_in}."""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Unsupported content type: {content_type}")
    key = build_object_key(organization_id, filename)
    try:
        url = _signed_url("PUT", key, content_type=content_type)
    except Exception as exc:  # signing/key errors → surface as StorageError
        raise StorageError(f"GCS signing failed: {exc}") from exc
    return {
        "url": url,
        "key": key,
        "content_type": content_type,
        "expires_in": settings.GCS_SIGN_EXPIRY,
    }


def create_download_url(key: str) -> str:
    """Signed GET URL for viewing/downloading a stored object."""
    try:
        return _signed_url("GET", key)
    except Exception as exc:
        raise StorageError(f"GCS signing failed: {exc}") from exc


def fetch_object_bytes(key: str) -> bytes:
    """Read a stored object's bytes server-side (used by the OCR fallback). Fetches
    via a short-lived signed GET URL so no static credential is embedded."""
    url = create_download_url(key)
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            return resp.read()
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
        raise StorageError(f"GCS fetch failed: {exc}") from exc
