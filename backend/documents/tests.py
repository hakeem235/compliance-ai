import json

from django.test import TestCase

from organizations.models import Organization

from .models import Document
from .serializers import DocumentSerializer
from .views import _extract_json


class _FakeView:
    def __init__(self, action):
        self.action = action


class DocumentSerializerNulByteTests(TestCase):
    def test_strips_nul_bytes_from_content_text(self):
        # PDF/DOCX text extraction can emit NUL bytes, which DRF's
        # ProhibitNullCharactersValidator and Postgres text columns reject.
        # A valid extraction must not be rejected over an unprintable char.
        serializer = DocumentSerializer(data={
            "filename": "contract.pdf",
            "file_type": "pdf",
            "s3_key": "uploads/contract.pdf",
            "content_text": "Clause 1.\x00 The party\x00 agrees.",
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["content_text"],
            "Clause 1. The party agrees.",
        )
        self.assertNotIn("\x00", serializer.validated_data["content_text"])

    def test_clean_content_text_passes_through_unchanged(self):
        serializer = DocumentSerializer(data={
            "filename": "contract.pdf",
            "file_type": "pdf",
            "s3_key": "uploads/contract.pdf",
            "content_text": "Clause 1. The party agrees.",
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["content_text"],
            "Clause 1. The party agrees.",
        )


class DocumentContentTextExposureTests(TestCase):
    def setUp(self):
        org = Organization.objects.create(name="Acme")
        self.doc = Document.objects.create(
            organization=org,
            filename="contract.pdf",
            file_type="pdf",
            s3_key="uploads/contract.pdf",
            content_text="Clause 1. The party agrees.",
        )

    def test_detail_includes_content_text(self):
        # The review viewer reads the full document text from the detail endpoint.
        data = DocumentSerializer(self.doc, context={"view": _FakeView("retrieve")}).data
        self.assertEqual(data["content_text"], "Clause 1. The party agrees.")

    def test_list_omits_content_text(self):
        # List responses must not ship the full text blob for every row.
        data = DocumentSerializer(self.doc, context={"view": _FakeView("list")}).data
        self.assertNotIn("content_text", data)


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
