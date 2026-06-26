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
import math
import re

from django.conf import settings

from .models import KnowledgeChunk

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


def active_embedder() -> str:
    """Name of the configured embedder. Only `placeholder` is implemented; any
    other value is treated as not-yet-wired by callers that need a real one."""
    return getattr(settings, "EMBEDDINGS_PROVIDER", "") or PLACEHOLDER_NAME


def _tokens(text: str) -> list[str]:
    # \w with Unicode captures Arabic and Latin word characters alike.
    return re.findall(r"\w+", text.lower(), flags=re.UNICODE)


def embed_text(text: str) -> list[float]:
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
