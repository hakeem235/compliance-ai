"""
Clerk JWT authentication for DRF.

Verifies the Clerk-issued session JWT on every request and resolves it to an
OrgUser. Role and organization_id are read only from the verified token
claims — never trusted from request body/query params.

NOTE: JWKS verification (via Clerk's public JWKS endpoint) is not wired yet —
CLERK_SECRET_KEY / CLERK_JWT_ISSUER must be provisioned first (see
hakeemproject/CHANNEL.md Phase 6 out-of-band entry). This is a structural
placeholder so the rest of the API layer can be built against a stable
`request.user` / `request.org_user` contract.
"""

from django.conf import settings
from rest_framework import authentication, exceptions

from .models import OrgUser


class ClerkJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        if not settings.CLERK_SECRET_KEY:
            raise exceptions.AuthenticationFailed(
                "Clerk is not configured (CLERK_SECRET_KEY missing) — cannot verify session token."
            )

        token = auth_header.removeprefix("Bearer ").strip()
        claims = self._verify_token(token)

        try:
            org_user = OrgUser.objects.select_related("organization").get(clerk_user_id=claims["sub"])
        except OrgUser.DoesNotExist:
            raise exceptions.AuthenticationFailed("No matching organization member for this session.")

        return (org_user, token)

    def _verify_token(self, token: str) -> dict:
        # TODO: verify signature against Clerk's JWKS endpoint and decode claims.
        raise exceptions.AuthenticationFailed("Clerk JWT verification not yet implemented.")
