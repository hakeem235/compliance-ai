"""
OCR via Azure Document Intelligence (Read model) — Arabic-capable.

FALLBACK ONLY: text-layer PDFs/DOCX are extracted client-side and never come
here. This path exists for image-only/scanned PDFs where no embedded text
layer is available, so we don't route extractable text through a paid API.

Inert until `OCR_AZURE_ENDPOINT` + `OCR_AZURE_KEY` are provided. Called over
stdlib `urllib` (no SDK dependency), consistent with how we call Anthropic.
"""

import json
import re
import time
import urllib.error
import urllib.request

from django.conf import settings


class OcrError(Exception):
    """Raised when OCR is requested but fails (network/timeout/Azure error)."""


# Async analyze can take a few seconds; poll with a hard ceiling so a stuck
# operation can't hang the request indefinitely.
_POLL_INTERVAL_SECONDS = 1.5
_POLL_MAX_ATTEMPTS = 20

# Control chars that DRF's CharField and Postgres text columns reject. Mirrors
# the NUL-strip lesson from ComplianceAI PR #6 — applied to OCR output too.
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def ocr_enabled() -> bool:
    """True only when Azure Document Intelligence is configured."""
    return bool(settings.OCR_AZURE_ENDPOINT and settings.OCR_AZURE_KEY)


def needs_ocr(content_text: str) -> bool:
    """Routing: OCR is the fallback used only when client-side extraction
    produced no usable text (e.g. a scanned/image-only PDF)."""
    return not (content_text or "").strip()


def sanitize(text: str) -> str:
    """Strip NUL/control chars so OCR output can't 400 downstream validation."""
    return _CONTROL_CHARS.sub("", text or "")


def _request(url: str, *, data=None, content_type=None) -> tuple[int, dict, dict]:
    headers = {"Ocp-Apim-Subscription-Key": settings.OCR_AZURE_KEY}
    if content_type:
        headers["Content-Type"] = content_type
    method = "POST" if data is not None else "GET"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read()
        payload = json.loads(body) if body else {}
        return resp.status, dict(resp.headers), payload


def extract_text(file_bytes: bytes, content_type: str) -> str:
    """Run the Azure Read model on a document's bytes and return sanitized text.

    Raises OcrError on any failure so callers can fall back cleanly rather than
    persisting a half-result.
    """
    if not ocr_enabled():
        raise OcrError("OCR is not configured.")

    endpoint = settings.OCR_AZURE_ENDPOINT.rstrip("/")
    analyze_url = (
        f"{endpoint}/documentintelligence/documentModels/"
        f"{settings.OCR_AZURE_MODEL}:analyze?api-version={settings.OCR_AZURE_API_VERSION}"
    )
    try:
        status, resp_headers, _ = _request(analyze_url, data=file_bytes, content_type=content_type)
        # Azure returns 202 + an Operation-Location to poll for the result.
        operation_url = resp_headers.get("Operation-Location") or resp_headers.get("operation-location")
        if status not in (200, 202) or not operation_url:
            raise OcrError(f"Unexpected analyze response (status {status}).")

        for _ in range(_POLL_MAX_ATTEMPTS):
            _, _, result = _request(operation_url)
            state = (result.get("status") or "").lower()
            if state == "succeeded":
                content = (result.get("analyzeResult") or {}).get("content", "")
                return sanitize(content)
            if state == "failed":
                raise OcrError("Azure reported the OCR operation failed.")
            time.sleep(_POLL_INTERVAL_SECONDS)
        raise OcrError("OCR timed out waiting for Azure to finish.")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as exc:
        raise OcrError(f"OCR request failed: {exc}") from exc
