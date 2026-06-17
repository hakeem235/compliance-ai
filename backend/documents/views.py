from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Document, GeneratedDocument
from .serializers import DocumentSerializer, GeneratedDocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(organization_id=self.request.user.organization_id).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id, uploaded_by=self.request.user)

    @action(detail=True, methods=["post"])
    def analyze(self, request, pk=None):
        """
        Kicks off AI contract review for this document.

        TODO: enqueue async job — extract text (OCR if needed) -> chunk/embed
        into the org's Pinecone namespace -> run AI Contract Review Engine ->
        persist DocumentAnalysis + ClauseFinding rows. Requires OPENAI_API_KEY
        and PINECONE_API_KEY to be provisioned first.
        """
        document = self.get_object()
        document.status = "processing"
        document.save(update_fields=["status"])
        return Response({"detail": "Analysis queued.", "document_id": document.id}, status=202)


class GeneratedDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = GeneratedDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GeneratedDocument.objects.filter(organization_id=self.request.user.organization_id).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id, created_by=self.request.user)
