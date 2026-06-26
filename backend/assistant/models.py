import uuid

from django.db import models

from organizations.models import Organization, OrgUser


class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="chat_sessions")
    user = models.ForeignKey(OrgUser, on_delete=models.CASCADE, related_name="chat_sessions")
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ChatMessage(models.Model):
    ROLE_CHOICES = [("user", "User"), ("assistant", "Assistant")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat_session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    citations = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class KnowledgeChunk(models.Model):
    """A retrievable chunk of legal/regulatory reference text plus its embedding.

    The corpus is shared across orgs (public law is not tenant data). The
    embedding is stored as a plain float list and similarity is computed in
    Python — adequate for the current small placeholder corpus. The production
    swap to pgvector's native VectorField + ANN index is gated on the real
    corpus + an approved embeddings provider (see CHANNEL Question 2026-06-26).

    `is_synthetic=True` marks placeholder content that must never be presented
    as authoritative; the retriever surfaces it so the prompt/UI can disclaim.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_title = models.CharField(max_length=255)
    source_ref = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    # Float vector; dimension must match the embedder that produced it.
    embedding = models.JSONField(default=list)
    embedder = models.CharField(max_length=64, default="placeholder")
    is_synthetic = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.source_title} ({self.source_ref})" if self.source_ref else self.source_title
