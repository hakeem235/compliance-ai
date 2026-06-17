from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ChatMessage, ChatSession
from .serializers import ChatSessionSerializer


class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(organization_id=self.request.user.organization_id).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id, user=self.request.user)

    @action(detail=True, methods=["post"])
    def ask(self, request, pk=None):
        """
        TODO: RAG pipeline — embed `request.data["content"]`, retrieve top-k
        chunks from `kb-{jurisdiction}` and `org-{id}` Pinecone namespaces,
        prompt GPT with citation-forcing template, persist both the user
        message and the cited assistant reply. Requires OPENAI_API_KEY and
        PINECONE_API_KEY.
        """
        session = self.get_object()
        question = request.data.get("content", "")
        ChatMessage.objects.create(chat_session=session, role="user", content=question)
        return Response(
            {"detail": "AI assistant not yet configured — OPENAI_API_KEY / PINECONE_API_KEY pending."},
            status=503,
        )
