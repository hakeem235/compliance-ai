import json

from django.test import TestCase

from .views import _extract_json


class ExtractJsonTests(TestCase):
    def test_parses_raw_json(self):
        result = _extract_json('{"risk_score": 50, "findings": []}')
        self.assertEqual(result["risk_score"], 50)

    def test_strips_surrounding_prose_and_markdown_fences(self):
        text = 'Here is the analysis:\n```json\n{"risk_score": 80, "findings": [{"category": "ip"}]}\n```\nLet me know if you need more.'
        result = _extract_json(text)
        self.assertEqual(result["risk_score"], 80)
        self.assertEqual(result["findings"][0]["category"], "ip")

    def test_raises_when_no_json_object_present(self):
        with self.assertRaises(ValueError):
            _extract_json("I cannot analyze this document.")

    def test_raises_on_malformed_json(self):
        with self.assertRaises(json.JSONDecodeError):
            _extract_json("{not valid json}")
