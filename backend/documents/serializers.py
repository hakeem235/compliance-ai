from rest_framework import serializers

from .models import ClauseFinding, Document, DocumentAnalysis, GeneratedDocument


class ClauseFindingSerializer(serializers.ModelSerializer):
    citation_source = serializers.StringRelatedField()

    class Meta:
        model = ClauseFinding
        fields = ["id", "clause_text", "risk_level", "category", "recommendation", "citation_source"]


class DocumentAnalysisSerializer(serializers.ModelSerializer):
    findings = ClauseFindingSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentAnalysis
        fields = ["id", "document", "risk_score", "risk_summary", "status", "model_version", "created_at", "findings"]
        read_only_fields = ["id", "created_at"]


class DocumentSerializer(serializers.ModelSerializer):
    latest_analysis = serializers.SerializerMethodField()
    # Writable on create (client-side extracted text) and readable on the
    # detail endpoint so the review viewer can render the actual document.
    # Stripped from the list response (see to_representation) to keep list
    # payloads small — the full text is only needed when viewing one document.
    content_text = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = Document
        fields = [
            "id", "filename", "file_type", "s3_key", "status", "version",
            "parent_document", "created_at", "updated_at", "latest_analysis", "content_text",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def to_internal_value(self, data):
        # PDF/DOCX text extraction can emit NUL bytes, which both DRF's
        # CharField (ProhibitNullCharactersValidator) and PostgreSQL text
        # fields reject. Strip them up front so a valid extraction isn't
        # rejected over an unprintable control char.
        raw = data.get("content_text")
        if isinstance(raw, str) and "\x00" in raw:
            data = data.copy()
            data["content_text"] = raw.replace("\x00", "")
        return super().to_internal_value(data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Only the retrieve (detail) endpoint needs the full document text;
        # drop it from list responses to avoid shipping large blobs per row.
        view = self.context.get("view")
        if view is not None and getattr(view, "action", None) != "retrieve":
            data.pop("content_text", None)
        return data

    def get_latest_analysis(self, obj):
        analysis = obj.analyses.order_by("-created_at").first()
        return DocumentAnalysisSerializer(analysis).data if analysis else None


class GeneratedDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedDocument
        fields = [
            "id", "doc_type", "questionnaire_answers", "draft_content",
            "exported_pdf_s3_key", "exported_docx_s3_key", "created_at",
        ]
        read_only_fields = ["id", "draft_content", "exported_pdf_s3_key", "exported_docx_s3_key", "created_at"]
