"""
Clerk JWT authentication for DRF.

Verifies the Clerk-issued session JWT on every request and resolves it to an
OrgUser. Role and organization_id are read only from the verified token
claims — never trusted from request body/query params.
"""

from functools import lru_cache

import jwt
from django.conf import settings
from rest_framework import authentication, exceptions

from .models import OrgUser


@lru_cache(maxsize=1)
def _jwks_client(issuer: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{issuer}/.well-known/jwks.json")


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

        try:
            org_user = OrgUser.objects.select_related("organization").get(clerk_user_id=claims["sub"])
        except OrgUser.DoesNotExist:
            raise exceptions.AuthenticationFailed("No matching organization member for this session.")

        return (org_user, token)

    def _verify_token(self, token: str) -> dict:
        try:
            signing_key = _jwks_client(settings.CLERK_JWT_ISSUER).get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=settings.CLERK_JWT_ISSUER,
                options={"verify_aud": False},
            )
        except jwt.PyJWTError as exc:
            raise exceptions.AuthenticationFailed(f"Invalid session token: {exc}") from exc
