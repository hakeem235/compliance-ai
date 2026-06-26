from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Organization, OrgUser
from .permissions import HasRole
from .serializers import OrgUserSerializer, OrganizationSerializer


class MeView(APIView):
    """Current user's own profile + org — readable by any authenticated user
    (unlike the admin/owner-gated members list)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from backoffice.permissions import is_platform_admin

        user = request.user
        data = OrgUserSerializer(user).data
        data["organization_name"] = user.organization.name
        # Surfaced so the frontend can show/hide the platform back-office nav.
        # The flag is advisory only — every back-office endpoint re-checks
        # IsPlatformAdmin server-side, so spoofing it grants nothing.
        data["is_platform_admin"] = is_platform_admin(user)
        return Response(data)


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Organization.objects.filter(id=self.request.user.organization_id)


class OrgUserViewSet(viewsets.ModelViewSet):
    serializer_class = OrgUserSerializer
    permission_classes = [IsAuthenticated, HasRole.for_roles("admin", "owner")]

    def get_queryset(self):
        return OrgUser.objects.filter(organization_id=self.request.user.organization_id)

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id)
