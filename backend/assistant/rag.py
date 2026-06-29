"""
RAG plumbing for the legal assistant: chunking → embedding → retrieval →
citation-back.

The embedder is pluggable. Today only a deterministic, credential-free
*placeholder* embedder is implemented so the whole pipeline is testable
against a synthetic corpus. Wiring a real provider (Voyage/OpenAI/local) is a
one-function swap in `embed_text`, gated on the Advisor's ruling (see CHANNEL
Question 2026-06-26). Likewise, similarity runs in Python over a JSONField
vector for now; the production swap to pgvector's native VectorField + ANN
index lands with the real corpus.
"""

import hashlib
import json
import math
import re
import urllib.error
import urllib.request

from django.conf import settings

from .models import KnowledgeChunk


class EmbeddingError(Exception):
    """Raised when a real embeddings provider is configured but fails."""

# Placeholder embedding dimension. A real provider will define its own; the
# `embedder` column on each chunk records which one produced the vector so a
# provider switch can re-embed rather than silently mix dimensions.
PLACEHOLDER_DIM = 256
PLACEHOLDER_NAME = "placeholder"

# Retrieval defaults.
DEFAULT_TOP_K = 3
# Cosine floor below which a chunk is considered irrelevant and dropped, so an
# off-topic question doesn't get spurious "citations".
MIN_SCORE = 0.10


def voyage_enabled() -> bool:
    """True when a Voyage API key is configured. Until then the credential-free
    placeholder embedder is used, keeping the synthetic pipeline + CI green."""
    return bool(getattr(settings, "VOYAGE_API_KEY", ""))


def vertex_enabled() -> bool:
    """True when in-Kingdom Vertex AI embeddings (me-central2) are configured.

    PDPL residency: Vertex keeps embedding generation inside KSA, replacing the
    US-hosted Voyage hop. Takes precedence over Voyage when both are set; the
    placeholder stays the default until either is configured."""
    return bool(
        getattr(settings, "VERTEX_PROJECT", "")
        and getattr(settings, "VERTEX_LOCATION", "")
        and getattr(settings, "VERTEX_EMBED_MODEL", "")
        and getattr(settings, "VERTEX_ACCESS_TOKEN", "")
    )


def active_embedder() -> str:
    """Name of the embedder currently producing vectors. Recorded on each chunk
    so a provider switch re-embeds rather than mixing incompatible spaces."""
    if vertex_enabled():
        return f"vertex:{settings.VERTEX_EMBED_MODEL}"
    if voyage_enabled():
        return settings.VOYAGE_MODEL
    return PLACEHOLDER_NAME


def _tokens(text: str) -> list[str]:
    # \w with Unicode captures Arabic and Latin word characters alike.
    return re.findall(r"\w+", text.lower(), flags=re.UNICODE)


def _placeholder_embed(text: str) -> list[float]:
    """Deterministic placeholder embedding: hashed bag-of-words, L2-normalized.

    Not semantic — but stable and locality-preserving (texts sharing words get
    higher cosine), which is enough to exercise and test retrieval end-to-end.
    """
    vec = [0.0] * PLACEHOLDER_DIM
    for tok in _tokens(text):
        bucket = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16) % PLACEHOLDER_DIM
        vec[bucket] += 1.0
    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0.0:
        return vec
    return [v / norm for v in vec]


def _voyage_embed(text: str) -> list[float]:
    """Embed via Voyage AI (stdlib REST, no SDK). Raises EmbeddingError on
    failure so callers don't persist a bad/empty vector."""
    body = json.dumps({"input": [text], "model": settings.VOYAGE_MODEL}).encode()
    request = urllib.request.Request(
        "https://api.voyageai.com/v1/embeddings",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.VOYAGE_API_KEY}",
            "content-type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read())
        return payload["data"][0]["embedding"]
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, KeyError, IndexError, ValueError) as exc:
        raise EmbeddingError(f"Voyage embedding failed: {exc}") from exc


def _vertex_embed(text: str) -> list[float]:
    """Embed via Vertex AI in me-central2 (stdlib REST, no SDK). In-Kingdom
    embeddings for PDPL residency. The OAuth bearer comes from the Cloud Run
    service account (metadata server / ADC) in production; settings.VERTEX_ACCESS_TOKEN
    is the explicit override that also makes the scaffold testable.

    Raises EmbeddingError on failure so callers don't persist a bad vector."""
    endpoint = (
        f"https://{settings.VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/"
        f"{settings.VERTEX_PROJECT}/locations/{settings.VERTEX_LOCATION}/publishers/"
        f"google/models/{settings.VERTEX_EMBED_MODEL}:predict"
    )
    body = json.dumps({"instances": [{"content": text}]}).encode()
    request = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.VERTEX_ACCESS_TOKEN}",
            "content-type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read())
        return payload["predictions"][0]["embeddings"]["values"]
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, KeyError, IndexError, ValueError) as exc:
        raise EmbeddingError(f"Vertex embedding failed: {exc}") from exc


def embed_text(text: str) -> list[float]:
    """Embed text with the active embedder: Vertex (in-Kingdom) when configured,
    else Voyage, else the deterministic placeholder. The same function embeds
    both corpus chunks and queries, so they always share a vector space."""
    if vertex_enabled():
        return _vertex_embed(text)
    if voyage_enabled():
        return _voyage_embed(text)
    return _placeholder_embed(text)


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return sum(x * y for x, y in zip(a, b))


def chunk_text(text: str, max_chars: int = 800) -> list[str]:
    """Split source text into paragraph-ish chunks under `max_chars`.

    Splits on blank lines first, then packs paragraphs greedily so a chunk
    stays a coherent passage rather than an arbitrary character window.
    """
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if current and len(current) + len(para) + 2 > max_chars:
            chunks.append(current)
            current = para
        else:
            current = f"{current}\n\n{para}" if current else para
    if current:
        chunks.append(current)
    return chunks


def retrieve(query: str, top_k: int = DEFAULT_TOP_K, min_score: float = MIN_SCORE) -> list[dict]:
    """Top-k knowledge chunks for a query, by cosine over the placeholder space.

    Returns a list of {chunk, score} dicts, ordered best-first, filtered by
    `min_score`. Only chunks embedded by the active embedder are compared, so a
    later provider switch can't mix incompatible vector spaces.
    """
    query_vec = embed_text(query)
    embedder = active_embedder()
    scored = []
    # TODO(pgvector): swap this Python-side cosine over a full-table scan to a
    # native pgvector VectorField + IVFFlat/HNSW index when the real corpus
    # lands. Fine for the small synthetic set; won't scale to vector retrieval.
    # The embedder/retrieval interface is storage-agnostic so this is localized.
    for chunk in KnowledgeChunk.objects.filter(embedder=embedder):
        score = cosine(query_vec, chunk.embedding)
        if score >= min_score:
            scored.append({"chunk": chunk, "score": score})
    scored.sort(key=lambda s: s["score"], reverse=True)
    return scored[:top_k]


def build_context(hits: list[dict]) -> str:
    """Render retrieved chunks as a numbered context block for the prompt."""
    blocks = []
    for i, hit in enumerate(hits, start=1):
        chunk = hit["chunk"]
        ref = f" — {chunk.source_ref}" if chunk.source_ref else ""
        blocks.append(f"[{i}] {chunk.source_title}{ref}\n{chunk.content}")
    return "\n\n".join(blocks)


def citations_from_hits(hits: list[dict]) -> list[dict]:
    """Citation payloads attached to the assistant message / shown in the UI."""
    return [
        {
            "index": i,
            "source_title": hit["chunk"].source_title,
            "source_ref": hit["chunk"].source_ref,
            "score": round(hit["score"], 4),
            "is_synthetic": hit["chunk"].is_synthetic,
        }
        for i, hit in enumerate(hits, start=1)
    ]
