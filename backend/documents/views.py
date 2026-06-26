import json
import re
import urllib.error
import urllib.request

from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ClauseFinding, Document, DocumentAnalysis, GeneratedDocument
from .serializers import DocumentSerializer, GeneratedDocumentSerializer

VALID_RISK_LEVELS = {"high", "medium", "low"}
VALID_CATEGORIES = {"liability", "termination", "confidentiality", "ip", "dispute_resolution", "other"}

_CONTENT_TYPE_BY_FILE_TYPE = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
}


def _recover_text_via_ocr(document) -> str:
    """OCR fallback for scanned/image-only documents: fetch the stored original
    and run it through Azure OCR. Returns sanitized text, or "" when OCR isn't
    applicable (no stored object), not configured, or fails. Never raises — the
    caller treats "" as "still no extractable text". Text-layer documents never
    reach here: they already have content_text from client-side extraction."""
    from . import ocr, storage

    if not (ocr.ocr_enabled() and storage.storage_enabled()):
        return ""
    if not document.s3_key or document.s3_key.startswith("local/"):
        return ""
    content_type = _CONTENT_TYPE_BY_FILE_TYPE.get(document.file_type, "application/octet-stream")
    try:
        file_bytes = storage.fetch_object_bytes(document.s3_key)
        return ocr.extract_text(file_bytes, content_type)
    except (ocr.OcrError, storage.StorageError):
        return ""

REVIEW_SYSTEM_PROMPT = (
    "You are the AI Contract Review Engine inside ComplianceAI, reviewing contracts for "
    "businesses operating in Saudi Arabia. Given the contract text, identify risky or "
    "noteworthy clauses with a focus on Saudi commercial law, labor law, and the Personal "
    "Data Protection Law (PDPL). Respond with ONLY a JSON object (no prose, no markdown "
    "fences) matching exactly this shape:\n"
    '{"risk_score": <int 0-100, higher = riskier>, "risk_summary": <string, 2-3 sentences>, '
    '"findings": [{"clause_text": <string, quote or closely paraphrase the actual clause>, '
    '"risk_level": <"high"|"medium"|"low">, '
    '"category": <"liability"|"termination"|"confidentiality"|"ip"|"dispute_resolution"|"other">, '
    '"recommendation": <string, 1-2 sentences>}]}\n'
    "Return at most 8 findings, ordered by severity. If the text is too short or not a "
    "contract, return risk_score 0 and an empty findings array, with risk_summary explaining why."
)


def _extract_json(text: str) -> dict:
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model response.")
    return json.loads(match.group(0))


def _review_contract(content_text: str) -> dict:
    body = json.dumps(
        {
            "model": settings.ANTHROPIC_MODEL,
            "max_tokens": 2000,
            "system": REVIEW_SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": content_text[:50000]}],
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
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.loads(response.read())
    raw_text = "".join(block.get("text", "") for block in payload.get("content", []))
    return _extract_json(raw_text)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(organization_id=self.request.user.organization_id).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id, uploaded_by=self.request.user)

    @action(detail=True, methods=["post"])
    def analyze(self, request, pk=None):
        document = self.get_object()

        # Quota gate: block when the org has used its monthly review allowance.
        # Checked before any state change so an over-limit request is a no-op.
        from billing.usage import review_usage

        usage = review_usage(request.user.organization)
        if usage["limit"] is not None and usage["used"] >= usage["limit"]:
            return Response(
                {
                    "detail": (
                        f"Monthly AI review limit reached ({usage['used']}/{usage['limit']} on the "
                        f"{usage['plan'] or 'free'} plan). Upgrade your plan to run more reviews this month."
                    ),
                    "code": "review_limit_reached",
                    "used": usage["used"],
                    "limit": usage["limit"],
                },
                status=402,
            )

        document.status = "processing"
        document.save(update_fields=["status"])

        if not settings.ANTHROPIC_API_KEY:
            document.status = "failed"
            document.save(update_fields=["status"])
            return Response({"detail": "Analysis not available — ANTHROPIC_API_KEY pending."}, status=503)

        if not document.content_text.strip():
            # Fallback: a scanned/image-only PDF has no client-extracted text.
            # Try OCR (Azure) on the stored original before giving up.
            recovered = _recover_text_via_ocr(document)
            if recovered.strip():
                document.content_text = recovered
                document.save(update_fields=["content_text"])
            else:
                DocumentAnalysis.objects.create(
                    document=document,
                    risk_score=None,
                    risk_summary=(
                        "This document's text could not be analyzed: no text could be extracted. "
                        "Text is read from the file's embedded text layer (PDF, DOCX, TXT) client-side; "
                        "scanned/image-only PDFs require OCR, which is unavailable or could not read "
                        "this file. Try re-uploading a text-based PDF or DOCX, or a .txt file."
                    ),
                    status="completed",
                    model_version=settings.ANTHROPIC_MODEL,
                )
                document.status = "failed"
                document.save(update_fields=["status"])
                return Response({"detail": "No extractable text for this file type.", "document_id": document.id}, status=200)

        try:
            result = _review_contract(document.content_text)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, json.JSONDecodeError):
            document.status = "failed"
            document.save(update_fields=["status"])
            return Response({"detail": "AI analysis failed. Please try again."}, status=502)

        analysis = DocumentAnalysis.objects.create(
            document=document,
            risk_score=result.get("risk_score"),
            risk_summary=result.get("risk_summary", ""),
            status="completed",
            model_version=settings.ANTHROPIC_MODEL,
        )
        for finding in result.get("findings", [])[:8]:
            risk_level = finding.get("risk_level") if finding.get("risk_level") in VALID_RISK_LEVELS else "low"
            category = finding.get("category") if finding.get("category") in VALID_CATEGORIES else "other"
            ClauseFinding.objects.create(
                document_analysis=analysis,
                clause_text=finding.get("clause_text", ""),
                risk_level=risk_level,
                category=category,
                recommendation=finding.get("recommendation", ""),
                # No KnowledgeSource grounding/retrieval yet (Pinecone unprovisioned) —
                # left unset rather than fabricating a citation.
                citation_source=None,
            )

        document.status = "analyzed"
        document.save(update_fields=["status"])
        return Response({"detail": "Analysis complete.", "document_id": document.id}, status=200)

    @action(detail=False, methods=["post"], url_path="upload-url")
    def upload_url(self, request):
        """Presigned S3 PUT URL for uploading a document straight from the browser.

        The client uploads to the returned URL, then creates the Document with
        the returned `key` as its `s3_key`. Returns 503 until S3 is configured.
        """
        from . import storage

        if not storage.storage_enabled():
            return Response(
                {"detail": "Document storage is not configured.", "code": "storage_not_configured"},
                status=503,
            )

        filename = (request.data.get("filename") or "").strip()
        content_type = (request.data.get("content_type") or "").strip()
        if not filename:
            return Response({"detail": "filename is required."}, status=400)

        try:
            presigned = storage.create_upload_url(request.user.organization_id, filename, content_type)
        except ValueError as exc:
            return Response({"detail": str(exc), "code": "unsupported_content_type"}, status=400)
        except storage.StorageError:
            return Response({"detail": "Could not create an upload URL. Please try again."}, status=502)

        return Response(presigned, status=200)

    @action(detail=True, methods=["get"], url_path="download-url")
    def download_url(self, request, pk=None):
        """Presigned S3 GET URL for viewing/downloading a stored document."""
        from . import storage

        document = self.get_object()  # tenant-scoped
        if not storage.storage_enabled():
            return Response(
                {"detail": "Document storage is not configured.", "code": "storage_not_configured"},
                status=503,
            )
        # Documents created before storage was wired carry a synthetic local
        # key with no object behind it — don't hand back a URL that 404s.
        if not document.s3_key or document.s3_key.startswith("local/"):
            return Response(
                {"detail": "No stored file for this document.", "code": "no_stored_object"},
                status=404,
            )

        try:
            url = storage.create_download_url(document.s3_key)
        except storage.StorageError:
            return Response({"detail": "Could not create a download URL. Please try again."}, status=502)

        return Response({"url": url}, status=200)

    @action(detail=True, methods=["post"], url_path="send-email")
    def send_email(self, request, pk=None):
        """Send the (edited) recommendation email draft via the org's SMTP config."""
        import smtplib

        from django.core.exceptions import ValidationError
        from django.core.validators import validate_email

        from compliance.mailer import send_email as smtp_send_email
        from compliance.models import OrgEmailConfig

        self.get_object()  # enforces tenant scoping (404 for other orgs' docs)

        config = OrgEmailConfig.objects.filter(organization_id=request.user.organization_id).first()
        if config is None:
            return Response(
                {
                    "detail": "No email (SMTP) configuration set for this organization. Configure it in Settings first.",
                    "code": "email_not_configured",
                },
                status=400,
            )

        subject = (request.data.get("subject") or "").strip()
        body = (request.data.get("body") or "").strip()
        raw_recipients = request.data.get("recipients") or []
        if not subject:
            return Response({"detail": "Subject is required."}, status=400)
        if not body:
            return Response({"detail": "Message body is required."}, status=400)
        if not isinstance(raw_recipients, list) or not raw_recipients:
            return Response({"detail": "At least one recipient is required."}, status=400)

        recipients = []
        for entry in raw_recipients:
            email = str(entry).strip()
            try:
                validate_email(email)
            except ValidationError:
                return Response({"detail": f"Invalid recipient email: {email}"}, status=400)
            recipients.append(email)

        try:
            sent = smtp_send_email(config, subject, body, recipients)
        except (smtplib.SMTPException, OSError):
            return Response({"detail": "Failed to send email. Check your SMTP settings."}, status=502)

        return Response({"detail": "Email sent.", "sent": sent, "recipients": recipients}, status=200)


class GeneratedDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = GeneratedDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GeneratedDocument.objects.filter(organization_id=self.request.user.organization_id).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id, created_by=self.request.user)
