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


def azure_enabled() -> bool:
    """True only when Azure Document Intelligence is configured."""
    return bool(settings.OCR_AZURE_ENDPOINT and settings.OCR_AZURE_KEY)


def gcp_enabled() -> bool:
    """True only when in-Kingdom GCP Document AI (me-central2) is configured.

    PDPL residency: keeps scanned-document OCR inside KSA, replacing the Azure
    hop. Selected by OCR_PROVIDER=gcp; inert until project + processor + bearer
    are all set."""
    return bool(
        settings.OCR_GCP_PROJECT
        and settings.OCR_GCP_LOCATION
        and settings.OCR_GCP_PROCESSOR_ID
        and settings.OCR_GCP_ACCESS_TOKEN
    )


def _provider() -> str:
    """Active OCR provider name: 'gcp' when selected, else 'azure' (default)."""
    return "gcp" if settings.OCR_PROVIDER.lower() == "gcp" else "azure"


def ocr_enabled() -> bool:
    """True only when the active OCR provider is fully configured."""
    return gcp_enabled() if _provider() == "gcp" else azure_enabled()


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
    """Run the active OCR provider on a document's bytes and return sanitized text.

    Routes to GCP Document AI (in-Kingdom, me-central2) when OCR_PROVIDER=gcp,
    else Azure Document Intelligence. Raises OcrError on any failure so callers
    can fall back cleanly rather than persisting a half-result.
    """
    if not ocr_enabled():
        raise OcrError("OCR is not configured.")
    if _provider() == "gcp":
        return _extract_text_gcp(file_bytes, content_type)
    return _extract_text_azure(file_bytes, content_type)


def _extract_text_gcp(file_bytes: bytes, content_type: str) -> str:
    """GCP Document AI (me-central2) synchronous `:process`. In-Kingdom OCR for
    PDPL residency; Arabic-capable. Bearer comes from the Cloud Run service
    account (metadata/ADC) in prod; settings.OCR_GCP_ACCESS_TOKEN is the explicit,
    testable override. stdlib REST — no SDK."""
    import base64

    endpoint = (
        f"https://{settings.OCR_GCP_LOCATION}-documentai.googleapis.com/v1/projects/"
        f"{settings.OCR_GCP_PROJECT}/locations/{settings.OCR_GCP_LOCATION}/processors/"
        f"{settings.OCR_GCP_PROCESSOR_ID}:process"
    )
    body = json.dumps(
        {
            "rawDocument": {
                "content": base64.b64encode(file_bytes).decode("ascii"),
                "mimeType": content_type,
            }
        }
    ).encode()
    req = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.OCR_GCP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read() or b"{}")
        text = (payload.get("document") or {}).get("text", "")
        return sanitize(text)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as exc:
        raise OcrError(f"OCR request failed: {exc}") from exc


def _extract_text_azure(file_bytes: bytes, content_type: str) -> str:
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
