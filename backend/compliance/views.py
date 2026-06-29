from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .mailer import send_email
from .models import ComplianceEvent, OrgEmailConfig
from .serializers import ComplianceEventSerializer, OrgEmailConfigSerializer


class ComplianceEventViewSet(viewsets.ModelViewSet):
    serializer_class = ComplianceEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ComplianceEvent.objects.filter(organization_id=self.request.user.organization_id).order_by("due_date")

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id)


class EmailConfigView(APIView):
    """Read/write the current org's SMTP configuration for reminder emails."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = OrgEmailConfig.objects.filter(organization_id=request.user.organization_id).first()
        if not config:
            return Response({"configured": False})
        data = OrgEmailConfigSerializer(config).data
        data["configured"] = True
        return Response(data)

    def put(self, request):
        config = OrgEmailConfig.objects.filter(organization_id=request.user.organization_id).first()
        serializer = OrgEmailConfigSerializer(config, data=request.data, partial=bool(config))
        serializer.is_valid(raise_exception=True)
        serializer.save(organization_id=request.user.organization_id)
        data = serializer.data
        data["configured"] = True
        return Response(data)


class EmailConfigTestView(APIView):
    """Send a test email through the org's saved SMTP config to verify it works."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        config = OrgEmailConfig.objects.filter(organization_id=request.user.organization_id).first()
        if not config or not config.has_password:
            return Response(
                {"detail": "Email is not fully configured yet. Save host, credentials and a from address first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        recipient = request.data.get("to") or request.user.email
        if not recipient:
            return Response({"detail": "No recipient address available."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            send_email(
                config,
                subject="Moutabaq test email",
                body="This is a test email confirming your SMTP configuration works. — Moutabaq",
                recipients=[recipient],
            )
        except Exception as exc:  # noqa: BLE001 — surface the SMTP error to the user
            return Response({"detail": f"Sending failed: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"detail": f"Test email sent to {recipient}."})
