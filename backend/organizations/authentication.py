"""
Clerk JWT authentication for DRF.

Verifies the Clerk-issued session JWT on every request and resolves it to an
OrgUser. Role and organization_id are read only from the verified token
claims — never trusted from request body/query params.

Signature verification is delegated to PyJWT (RS256 against the instance's
JWKS) — we never hand-roll crypto on this security boundary.
"""

from functools import lru_cache

import jwt
from django.conf import settings
from rest_framework import authentication, exceptions

from .models import OrgUser

# JWKS is cached in-process for this long; a `kid` miss (key rotation) forces a
# fresh fetch regardless, so a rotated signing key is picked up immediately.
_JWKS_LIFESPAN_SECONDS = 600


@lru_cache(maxsize=2)
def _jwks_client(issuer: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(
        f"{issuer}/.well-known/jwks.json",
        cache_keys=True,
        lifespan=_JWKS_LIFESPAN_SECONDS,
    )


def _signing_key(issuer: str, token: str):
    """Resolve the signing key, refreshing the JWKS once on a `kid` miss."""
    try:
        return _jwks_client(issuer).get_signing_key_from_jwt(token)
    except jwt.PyJWKClientError:
        # Likely a rotated key not in the cached set — drop the cached client
        # and refetch once before giving up.
        _jwks_client.cache_clear()
        return _jwks_client(issuer).get_signing_key_from_jwt(token)


class ClerkJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        if not settings.CLERK_SECRET_KEY or not settings.CLERK_JWT_ISSUER:
            raise exceptions.AuthenticationFailed(
                "Clerk is not configured (CLERK_SECRET_KEY/CLERK_JWT_ISSUER missing) — cannot verify session token."
            )

        token = auth_header.removeprefix("Bearer ").strip()
        claims = self._verify_token(token)

        sub = claims.get("sub")
        if not sub:
            raise exceptions.AuthenticationFailed("Session token has no subject claim.")

        try:
            org_user = OrgUser.objects.select_related("organization").get(clerk_user_id=sub)
        except OrgUser.DoesNotExist:
            raise exceptions.AuthenticationFailed("No matching organization member for this session.")

        return (org_user, token)

    def _verify_token(self, token: str) -> dict:
        # Audience is only enforced when configured — Clerk's default session
        # tokens carry no `aud`, so enabling it unconditionally would reject
        # every valid token. When set, a missing/wrong `aud` is rejected.
        audience = settings.CLERK_JWT_AUDIENCE or None
        try:
            signing_key = _signing_key(settings.CLERK_JWT_ISSUER, token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=settings.CLERK_JWT_ISSUER,
                audience=audience,
                options={"verify_aud": audience is not None, "require": ["exp", "iat"]},
                # Tolerate small clock skew between Clerk's issuer and this
                # server — without it, a token whose `iat`/`nbf` is a few
                # seconds ahead of local time is rejected as "not yet valid".
                leeway=60,
            )
        except jwt.PyJWTError as exc:
            raise exceptions.AuthenticationFailed(f"Invalid session token: {exc}") from exc
