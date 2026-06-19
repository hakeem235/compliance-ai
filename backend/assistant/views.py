import json
import urllib.error
import urllib.request

from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ChatMessage, ChatSession
from .serializers import ChatMessageSerializer, ChatSessionSerializer

ANTHROPIC_MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = (
    "You are the AI Legal Assistant inside ComplianceAI, a contract-review and compliance "
    "platform for businesses operating in Saudi Arabia. Answer questions about Saudi "
    "commercial law, labor law, and the Personal Data Protection Law (PDPL) in clear, "
    "practical terms. You are not a lawyer; never claim to give legal advice. Keep answers "
    "concise (under ~180 words) unless the question requires more detail."
)

DISCLAIMER = (
    "\n\nComplianceAI provides AI-assisted guidance and does not constitute legal advice. "
    "Consult a licensed attorney for legal decisions."
)


def _ask_claude(question: str) -> str:
    body = json.dumps(
        {
            "model": ANTHROPIC_MODEL,
            "max_tokens": 600,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": question}],
        }
    ).encode()
    request = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        method="POST",
        headers={
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read())
    return "".join(block.get("text", "") for block in payload.get("content", [])).strip()


class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(organization_id=self.request.user.organization_id).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id, user=self.request.user)

    @action(detail=True, methods=["post"])
    def ask(self, request, pk=None):
        session = self.get_object()
        question = request.data.get("content", "")
        ChatMessage.objects.create(chat_session=session, role="user", content=question)

        if not settings.ANTHROPIC_API_KEY:
            return Response(
                {"detail": "AI assistant not yet configured — ANTHROPIC_API_KEY pending."},
                status=503,
            )

        try:
            answer = _ask_claude(question)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
            return Response(
                {"detail": "AI assistant is temporarily unavailable. Please try again."},
                status=502,
            )

        assistant_message = ChatMessage.objects.create(
            chat_session=session,
            role="assistant",
            content=answer + DISCLAIMER,
            # No retrieval/RAG pipeline yet (Pinecone unprovisioned) — answers are a direct
            # model call, not grounded in retrieved source documents, so no real citations.
            citations=[],
        )
        if not session.title:
            session.title = question[:80]
            session.save(update_fields=["title"])

        return Response(ChatMessageSerializer(assistant_message).data, status=201)
