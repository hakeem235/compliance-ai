import json
from unittest import mock

from django.test import TestCase, override_settings

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


class StorageTests(TestCase):
    def setUp(self):
        from documents import storage

        self.storage = storage

    @override_settings(
        AWS_STORAGE_BUCKET_NAME="", AWS_S3_REGION_NAME="", AWS_ACCESS_KEY_ID="", AWS_SECRET_ACCESS_KEY=""
    )
    def test_disabled_when_unconfigured(self):
        self.assertFalse(self.storage.storage_enabled())

    @override_settings(
        AWS_STORAGE_BUCKET_NAME="bucket",
        AWS_S3_REGION_NAME="me-south-1",
        AWS_ACCESS_KEY_ID="AKIA",
        AWS_SECRET_ACCESS_KEY="secret",
    )
    def test_enabled_when_fully_configured(self):
        # boto3 is installed in the test env; full config => enabled.
        self.assertTrue(self.storage.storage_enabled())

    def test_object_key_is_org_scoped_and_unique(self):
        k1 = self.storage.build_object_key("org-1", "Contract A.pdf")
        k2 = self.storage.build_object_key("org-1", "Contract A.pdf")
        self.assertTrue(k1.startswith("orgs/org-1/documents/"))
        self.assertNotEqual(k1, k2)  # uuid keeps repeated uploads distinct
        self.assertNotIn(" ", k1.split("/")[-1] or "")  # path-safe handled

    def test_object_key_strips_path_separators(self):
        key = self.storage.build_object_key("org-1", "../../etc/passwd")
        # The filename segment must not introduce extra path traversal.
        self.assertTrue(key.startswith("orgs/org-1/documents/"))
        self.assertNotIn("..", key.split("/")[-1])

    @override_settings(
        AWS_STORAGE_BUCKET_NAME="bucket",
        AWS_S3_REGION_NAME="me-south-1",
        AWS_ACCESS_KEY_ID="AKIA",
        AWS_SECRET_ACCESS_KEY="secret",
        AWS_S3_PRESIGN_EXPIRY=900,
    )
    def test_create_upload_url_presigns_with_expected_params(self):
        fake = mock.Mock()
        fake.generate_presigned_url.return_value = "https://s3.example/presigned-put"
        with mock.patch.object(self.storage, "_client", return_value=fake):
            result = self.storage.create_upload_url("org-1", "deal.pdf", "application/pdf")
        self.assertEqual(result["url"], "https://s3.example/presigned-put")
        self.assertTrue(result["key"].startswith("orgs/org-1/documents/"))
        self.assertEqual(result["expires_in"], 900)
        _, kwargs = fake.generate_presigned_url.call_args
        self.assertEqual(kwargs["Params"]["Bucket"], "bucket")
        self.assertEqual(kwargs["Params"]["ContentType"], "application/pdf")
        self.assertEqual(kwargs["ExpiresIn"], 900)

    def test_create_upload_url_rejects_unsupported_content_type(self):
        with self.assertRaises(ValueError):
            self.storage.create_upload_url("org-1", "image.png", "image/png")


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
