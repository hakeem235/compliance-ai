import uuid

from django.db import models

from organizations.models import Organization, OrgUser


class Document(models.Model):
    FILE_TYPE_CHOICES = [("pdf", "PDF"), ("docx", "DOCX"), ("txt", "TXT")]
    STATUS_CHOICES = [
        ("uploaded", "Uploaded"),
        ("processing", "Processing"),
        ("analyzed", "Analyzed"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="documents")
    uploaded_by = models.ForeignKey(OrgUser, on_delete=models.SET_NULL, null=True, related_name="uploaded_documents")
    filename = models.CharField(max_length=512)
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    s3_key = models.CharField(max_length=1024)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="uploaded")
    version = models.PositiveIntegerField(default=1)
    parent_document = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="versions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.filename} (v{self.version})"


class DocumentAnalysis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="analyses")
    risk_score = models.PositiveSmallIntegerField(null=True, blank=True)
    risk_summary = models.TextField(blank=True)
    status = models.CharField(max_length=20, default="pending")
    model_version = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class KnowledgeSource(models.Model):
    SOURCE_TYPE_CHOICES = [("law", "Law"), ("regulation", "Regulation"), ("guide", "Guide")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    jurisdiction = models.CharField(max_length=10, default="SA")
    title = models.CharField(max_length=512)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES)
    section_ref = models.CharField(max_length=255, blank=True)
    content_excerpt = models.TextField(blank=True)
    source_url = models.URLField(blank=True)

    def __str__(self):
        return f"{self.title} [{self.jurisdiction}]"


class ClauseFinding(models.Model):
    RISK_LEVEL_CHOICES = [("high", "High"), ("medium", "Medium"), ("low", "Low")]
    CATEGORY_CHOICES = [
        ("liability", "Liability"),
        ("termination", "Termination"),
        ("confidentiality", "Confidentiality"),
        ("ip", "IP Ownership"),
        ("dispute_resolution", "Dispute Resolution"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_analysis = models.ForeignKey(DocumentAnalysis, on_delete=models.CASCADE, related_name="findings")
    clause_text = models.TextField()
    risk_level = models.CharField(max_length=10, choices=RISK_LEVEL_CHOICES)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="other")
    recommendation = models.TextField(blank=True)
    citation_source = models.ForeignKey(KnowledgeSource, on_delete=models.SET_NULL, null=True, blank=True)


class GeneratedDocument(models.Model):
    DOC_TYPE_CHOICES = [
        ("nda", "NDA"),
        ("employment", "Employment Contract"),
        ("freelance", "Freelance Agreement"),
        ("vendor", "Vendor Contract"),
        ("service", "Service Agreement"),
        ("non_compete", "Non-Compete Agreement"),
        ("warning_letter", "Warning Letter"),
        ("termination_letter", "Termination Letter"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="generated_documents")
    created_by = models.ForeignKey(OrgUser, on_delete=models.SET_NULL, null=True)
    doc_type = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES)
    questionnaire_answers = models.JSONField(default=dict)
    draft_content = models.TextField(blank=True)
    exported_pdf_s3_key = models.CharField(max_length=1024, blank=True)
    exported_docx_s3_key = models.CharField(max_length=1024, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
