from rest_framework import serializers

from .models import ClauseFinding, Document, DocumentAnalysis, GeneratedDocument


class ClauseFindingSerializer(serializers.ModelSerializer):
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

    class Meta:
        model = Document
        fields = [
            "id", "filename", "file_type", "s3_key", "status", "version",
            "parent_document", "created_at", "updated_at", "latest_analysis",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

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
