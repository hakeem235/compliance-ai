"""Symmetric encryption for secrets stored at rest (per-org SMTP passwords).

Uses Fernet (AES-128-CBC + HMAC) from the already-present `cryptography`
package. The key comes from EMAIL_CONFIG_ENCRYPTION_KEY; in dev it falls back
to a deterministic key derived from DJANGO_SECRET_KEY so the feature works
out of the box, but production MUST set a dedicated key (documented in
.env.example) so rotating the Django secret doesn't lock out stored secrets.
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet() -> Fernet:
    key = settings.EMAIL_CONFIG_ENCRYPTION_KEY
    if not key:
        # Deterministic dev fallback derived from the Django secret key.
        key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_secret(plaintext: str) -> str:
    if not plaintext:
        return ""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(token: str) -> str:
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        # Key rotated or ciphertext corrupted — treat as no usable secret
        # rather than crashing the reminder run.
        return ""
