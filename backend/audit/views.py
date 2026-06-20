from assistant.models import ChatMessage
from documents.models import Document, DocumentAnalysis
from organizations.models import OrgUser
from organizations.permissions import HasRole
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog
from .serializers import AuditLogSerializer

# Admin sections are visible to org admins and owners only.
AdminRole = HasRole.for_roles("admin", "owner")


class AuditLogView(APIView):
    """Recent audit-log entries for the current org (most recent first)."""

    permission_classes = [IsAuthenticated, AdminRole]

    def get(self, request):
        logs = AuditLog.objects.filter(organization_id=request.user.organization_id)[:50]
        return Response(AuditLogSerializer(logs, many=True).data)


class AdminStatsView(APIView):
    """Org-level usage stats for the admin dashboard — all computed from real data."""

    permission_classes = [IsAuthenticated, AdminRole]

    def get(self, request):
        org_id = request.user.organization_id
        docs = Document.objects.filter(organization_id=org_id)
        storage_bytes = sum(len((t or "").encode("utf-8")) for t in docs.values_list("content_text", flat=True))
        ai_calls = (
            ChatMessage.objects.filter(chat_session__organization_id=org_id, role="assistant").count()
            + DocumentAnalysis.objects.filter(document__organization_id=org_id).count()
        )
        return Response(
            {
                "active_users": OrgUser.objects.filter(organization_id=org_id).count(),
                "docs_analyzed": docs.filter(status="analyzed").count(),
                "ai_calls": ai_calls,
                "storage_bytes": storage_bytes,
            }
        )
