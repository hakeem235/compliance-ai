from django.test import SimpleTestCase

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
