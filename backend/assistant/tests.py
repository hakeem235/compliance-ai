from django.test import SimpleTestCase, TestCase

from . import rag
from .models import KnowledgeChunk
from .views import (
    MAX_DOCUMENT_CONTEXT_CHARS,
    SYSTEM_PROMPT,
    _build_system_prompt,
)


class BuildSystemPromptTests(SimpleTestCase):
    def test_no_document_returns_base_prompt(self):
        self.assertEqual(_build_system_prompt(), SYSTEM_PROMPT)
        self.assertEqual(_build_system_prompt(""), SYSTEM_PROMPT)

    def test_document_text_is_injected(self):
        prompt = _build_system_prompt("Clause 5: unlimited liability.")
        self.assertIn(SYSTEM_PROMPT, prompt)
        self.assertIn("Clause 5: unlimited liability.", prompt)
        self.assertIn("--- DOCUMENT START ---", prompt)
        self.assertIn("--- DOCUMENT END ---", prompt)

    def test_document_text_is_capped(self):
        oversized = "x" * (MAX_DOCUMENT_CONTEXT_CHARS + 5000)
        prompt = _build_system_prompt(oversized)
        # Only the capped slice of the document is embedded.
        self.assertEqual(prompt.count("x"), MAX_DOCUMENT_CONTEXT_CHARS)

    def test_knowledge_context_is_injected_with_citation_instruction(self):
        prompt = _build_system_prompt("", knowledge_context="[1] Some Source\nGround truth passage.")
        self.assertIn("--- REFERENCES START ---", prompt)
        self.assertIn("Ground truth passage.", prompt)
        self.assertIn("[1]", prompt)


class EmbedderTests(SimpleTestCase):
    def test_embedding_is_normalized_and_fixed_dim(self):
        vec = rag.embed_text("data protection and consent")
        self.assertEqual(len(vec), rag.PLACEHOLDER_DIM)
        norm = sum(v * v for v in vec) ** 0.5
        self.assertAlmostEqual(norm, 1.0, places=6)

    def test_embedding_is_deterministic(self):
        self.assertEqual(rag.embed_text("hello world"), rag.embed_text("hello world"))

    def test_empty_text_returns_zero_vector(self):
        self.assertEqual(rag.embed_text(""), [0.0] * rag.PLACEHOLDER_DIM)

    def test_arabic_tokens_embed(self):
        # \w+ with UNICODE must capture Arabic, producing a non-zero vector.
        vec = rag.embed_text("حماية البيانات الشخصية")
        self.assertTrue(any(v != 0.0 for v in vec))

    def test_cosine_self_is_one(self):
        vec = rag.embed_text("termination and notice period")
        self.assertAlmostEqual(rag.cosine(vec, vec), 1.0, places=6)

    def test_chunking_packs_paragraphs_under_limit(self):
        text = "Para one.\n\n" + ("word " * 100) + "\n\nPara three."
        chunks = rag.chunk_text(text, max_chars=200)
        self.assertTrue(len(chunks) >= 2)


class RetrievalTests(TestCase):
    def setUp(self):
        self.corpus = {
            "data": "Personal data must be processed lawfully with consent and access rights.",
            "labor": "Employment contracts state wage, working hours, and notice period.",
            "vat": "Value Added Tax applies to goods and services at the standard rate.",
        }
        for ref, content in self.corpus.items():
            KnowledgeChunk.objects.create(
                source_title=f"Synthetic {ref}",
                source_ref=ref,
                content=content,
                embedding=rag.embed_text(content),
                embedder=rag.active_embedder(),
                is_synthetic=True,
            )

    def test_retrieves_most_relevant_chunk_first(self):
        hits = rag.retrieve("What are the rules on personal data and consent?")
        self.assertTrue(hits)
        self.assertEqual(hits[0]["chunk"].source_ref, "data")

    def test_offtopic_query_returns_no_hits(self):
        hits = rag.retrieve("zzz qqq xyzzy nonsense token")
        self.assertEqual(hits, [])

    def test_only_active_embedder_chunks_are_searched(self):
        KnowledgeChunk.objects.create(
            source_title="Stale",
            source_ref="stale",
            content="Personal data consent rights wage tax everything matches",
            embedding=[0.0] * rag.PLACEHOLDER_DIM,
            embedder="some-old-provider",
            is_synthetic=True,
        )
        hits = rag.retrieve("personal data consent")
        self.assertTrue(all(h["chunk"].embedder == rag.active_embedder() for h in hits))

    def test_citations_payload_shape(self):
        hits = rag.retrieve("notice period and wage in employment contracts")
        cites = rag.citations_from_hits(hits)
        self.assertTrue(cites)
        first = cites[0]
        self.assertEqual(first["index"], 1)
        self.assertIn("source_title", first)
        self.assertIn("score", first)
        self.assertTrue(first["is_synthetic"])


class SeedCommandTests(TestCase):
    def test_seed_command_populates_corpus(self):
        from django.core.management import call_command

        call_command("seed_synthetic_corpus")
        chunks = KnowledgeChunk.objects.all()
        self.assertTrue(chunks.exists())
        self.assertTrue(all(c.is_synthetic for c in chunks))
        self.assertTrue(all(len(c.embedding) == rag.PLACEHOLDER_DIM for c in chunks))

    def test_seed_reset_does_not_duplicate(self):
        from django.core.management import call_command

        call_command("seed_synthetic_corpus")
        count_after_first = KnowledgeChunk.objects.count()
        call_command("seed_synthetic_corpus", reset=True)
        self.assertEqual(KnowledgeChunk.objects.count(), count_after_first)
