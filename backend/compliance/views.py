from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import ComplianceEvent
from .serializers import ComplianceEventSerializer


class ComplianceEventViewSet(viewsets.ModelViewSet):
    serializer_class = ComplianceEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ComplianceEvent.objects.filter(organization_id=self.request.user.organization_id).order_by("due_date")

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id)
