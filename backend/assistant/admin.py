from django.contrib import admin

from .models import ChatMessage, ChatSession, KnowledgeChunk

admin.site.register(ChatSession)
admin.site.register(ChatMessage)


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = ("source_title", "source_ref", "embedder", "is_synthetic", "created_at")
    list_filter = ("is_synthetic", "embedder")
    search_fields = ("source_title", "source_ref", "content")
