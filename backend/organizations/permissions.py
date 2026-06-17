from rest_framework.permissions import BasePermission


class IsOrgMember(BasePermission):
    """Authenticated OrgUser only; org scoping itself happens in each viewset's get_queryset."""

    def has_permission(self, request, view):
        return getattr(request.user, "organization_id", None) is not None


class HasRole(BasePermission):
    """Usage: permission_classes = [HasRole.for_roles("admin", "owner")]"""

    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        return getattr(request.user, "role", None) in self.allowed_roles

    @classmethod
    def for_roles(cls, *roles: str):
        return type("ScopedHasRole", (cls,), {"allowed_roles": roles})
