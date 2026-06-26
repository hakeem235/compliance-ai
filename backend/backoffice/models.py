import uuid

from django.db import models


class PlatformAdmin(models.Model):
    """Allowlist of platform staff (your team) who may access the cross-tenant
    back-office. This is deliberately SEPARATE from org roles: an org's own
    admin/owner has no platform access. Membership here is the single source of
    truth for `IsPlatformAdmin`, granting visibility across ALL client orgs.

    Rows are created out-of-band (management command / Django admin / a
    bootstrap env allowlist), never self-served through the API.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clerk_user_id = models.CharField(max_length=255, unique=True)
    email = models.EmailField(blank=True)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email or self.clerk_user_id
