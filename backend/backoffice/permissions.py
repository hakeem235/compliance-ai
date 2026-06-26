from django.conf import settings
from rest_framework import permissions

from .models import PlatformAdmin


def is_platform_admin(user) -> bool:
    """True only for allow-listed platform staff. Default-deny: anything other
    than an authenticated OrgUser whose clerk_user_id is in the PlatformAdmin
    table (or the bootstrap env allowlist) is rejected."""
    clerk_user_id = getattr(user, "clerk_user_id", None)
    if not clerk_user_id:
        return False
    # Bootstrap allowlist for standing up the first platform admin before any
    # row exists. Comma-separated Clerk user ids in PLATFORM_ADMIN_CLERK_IDS.
    bootstrap = {
        v.strip()
        for v in getattr(settings, "PLATFORM_ADMIN_CLERK_IDS", "").split(",")
        if v.strip()
    }
    if clerk_user_id in bootstrap:
        return True
    return PlatformAdmin.objects.filter(clerk_user_id=clerk_user_id).exists()


class IsPlatformAdmin(permissions.BasePermission):
    """Gate for the cross-tenant back-office. This is a security boundary —
    it intentionally permits reading/mutating data across ALL organizations,
    so it must only ever pass for platform staff."""

    message = "Platform administrator access required."

    def has_permission(self, request, view):
        return bool(request.user and is_platform_admin(request.user))
