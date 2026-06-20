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

ANTHROPIC_MODEL = "claude-sonnet-4-6"
VALID_RISK_LEVELS = {"high", "medium", "low"}
VALID_CATEGORIES = {"liability", "termination", "confidentiality", "ip", "dispute_resolution", "other"}

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
            "model": ANTHROPIC_MODEL,
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
            DocumentAnalysis.objects.create(
                document=document,
                risk_score=None,
                risk_summary=(
                    "This document's text could not be analyzed: no text was extracted at "
                    "upload time. Text is extracted client-side from the file's embedded text "
                    "layer (PDF, DOCX, TXT) — there's no OCR pipeline, so scanned/image-only "
                    "PDFs and legacy .doc files aren't supported. Try re-uploading a text-based "
                    "PDF or DOCX, or a .txt file."
                ),
                status="completed",
                model_version=ANTHROPIC_MODEL,
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
            model_version=ANTHROPIC_MODEL,
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


class GeneratedDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = GeneratedDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GeneratedDocument.objects.filter(organization_id=self.request.user.organization_id).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id, created_by=self.request.user)
