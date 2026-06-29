from django.conf import settings
from rest_framework import permissions

from .models import PlatformAdmin


def is_platform_admin(user) -> bool:
    """True only for allow-listed platform staff. Default-deny: anything other
    than an authenticated OrgUser who has a PlatformAdmin row (or whose email is
    in the bootstrap env allowlist) is rejected."""
    user_id = getattr(user, "id", None)
    if not user_id:
        return False
    # Bootstrap allowlist for standing up the first platform admin before any
    # row exists. Comma-separated emails in PLATFORM_ADMIN_EMAILS.
    email = (getattr(user, "email", None) or "").strip().lower()
    bootstrap = {
        v.strip().lower()
        for v in getattr(settings, "PLATFORM_ADMIN_EMAILS", "").split(",")
        if v.strip()
    }
    if email and email in bootstrap:
        return True
    return PlatformAdmin.objects.filter(org_user_id=user_id).exists()


class IsPlatformAdmin(permissions.BasePermission):
    """Gate for the cross-tenant back-office. This is a security boundary —
    it intentionally permits reading/mutating data across ALL organizations,
    so it must only ever pass for platform staff."""

    message = "Platform administrator access required."

    def has_permission(self, request, view):
        return bool(request.user and is_platform_admin(request.user))
