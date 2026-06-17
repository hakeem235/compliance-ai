from django.contrib import admin

from .models import ClauseFinding, Document, DocumentAnalysis, GeneratedDocument, KnowledgeSource

admin.site.register(Document)
admin.site.register(DocumentAnalysis)
admin.site.register(KnowledgeSource)
admin.site.register(ClauseFinding)
admin.site.register(GeneratedDocument)
