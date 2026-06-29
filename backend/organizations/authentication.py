"""
Email/password JWT authentication for DRF.

Tokens are signed by this app (HS256 with DJANGO_SECRET_KEY) at login/register
and verified here on every request. The `sub` claim is the OrgUser id; role and
organization are read from the database via that id — never trusted from the
request body/query params. Replaces the previous Clerk integration.
"""

from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from rest_framework import authentication, exceptions

from .models import OrgUser

ALGORITHM = "HS256"


def make_token(org_user: OrgUser) -> str:
    """Issue a signed session token for an authenticated OrgUser."""
    now = datetime.now(timezone.utc)
    ttl_hours = getattr(settings, "AUTH_TOKEN_TTL_HOURS", 168)  # default 7 days
    payload = {
        "sub": str(org_user.id),
        "email": org_user.email,
        "iat": now,
        "exp": now + timedelta(hours=ttl_hours),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


class JWTAuthentication(authentication.BaseAuthentication):
    """Verify the app-issued Bearer token and resolve it to an OrgUser."""

    def authenticate_header(self, request):
        # Advertise the scheme so DRF returns 401 (not 403) on missing/invalid
        # credentials — the frontend keys off 401 to redirect to login.
        return "Bearer"

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.removeprefix("Bearer ").strip()
        try:
            claims = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[ALGORITHM],
                options={"require": ["exp", "iat", "sub"]},
                leeway=60,
            )
        except jwt.PyJWTError as exc:
            raise exceptions.AuthenticationFailed(f"Invalid session token: {exc}") from exc

        try:
            org_user = OrgUser.objects.select_related("organization").get(id=claims["sub"])
        except (OrgUser.DoesNotExist, ValueError, KeyError):
            raise exceptions.AuthenticationFailed("No matching user for this session.")

        return (org_user, token)
