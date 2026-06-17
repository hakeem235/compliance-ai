from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Organization, OrgUser
from .permissions import HasRole
from .serializers import OrganizationSerializer, OrgUserSerializer


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
