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


class SendEmailActionTests(TestCase):
    def setUp(self):
        from compliance.models import OrgEmailConfig
        from documents.views import DocumentViewSet

        self.org = Organization.objects.create(name="Acme")
        self.doc = Document.objects.create(
            organization=self.org, filename="contract.pdf", file_type="pdf", s3_key="k",
        )
        self.view = DocumentViewSet()
        self.view.kwargs = {"pk": str(self.doc.pk)}
        self.view.format_kwarg = None
        # request.user only needs organization_id; get_object() is patched per-test.
        self.user = type("U", (), {"organization_id": self.org.id, "organization": self.org})()
        self.view.get_object = lambda: self.doc
        self.OrgEmailConfig = OrgEmailConfig

    def _request(self, data):
        return type("R", (), {"data": data, "user": self.user})()

    def test_rejects_when_no_smtp_config(self):
        self.view.request = self._request({"subject": "Hi", "body": "Body", "recipients": ["a@b.com"]})
        resp = self.view.send_email(self.view.request, pk=str(self.doc.pk))
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["code"], "email_not_configured")

    def test_rejects_invalid_recipient(self):
        self.OrgEmailConfig.objects.create(organization=self.org, host="smtp.x", from_email="n@x.com")
        self.view.request = self._request({"subject": "Hi", "body": "Body", "recipients": ["not-an-email"]})
        resp = self.view.send_email(self.view.request, pk=str(self.doc.pk))
        self.assertEqual(resp.status_code, 400)

    def test_sends_via_org_smtp(self):
        import documents.views as views_mod

        self.OrgEmailConfig.objects.create(organization=self.org, host="smtp.x", from_email="n@x.com")
        sent_args = {}

        def fake_send(config, subject, body, recipients):
            sent_args.update(subject=subject, body=body, recipients=recipients)
            return len(recipients)

        # Patch the symbol imported lazily inside the action.
        from compliance import mailer
        orig = mailer.send_email
        mailer.send_email = fake_send
        try:
            self.view.request = self._request(
                {"subject": "Revisions", "body": "Please update", "recipients": ["a@b.com", " c@d.com "]}
            )
            resp = self.view.send_email(self.view.request, pk=str(self.doc.pk))
        finally:
            mailer.send_email = orig
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["sent"], 2)
        self.assertEqual(sent_args["recipients"], ["a@b.com", "c@d.com"])


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
