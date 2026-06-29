from django.test import TestCase

from organizations.models import Organization, OrgUser

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogSerializerTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Acme")

    def _log(self, actor=None):
        return AuditLog.objects.create(
            organization=self.org, actor=actor, action="POST /api/documents/", resource_type="document-list"
        )

    def test_actor_name_prefers_name(self):
        actor = OrgUser.objects.create(organization=self.org, email="a@x.com", name="Ada Lovelace")
        data = AuditLogSerializer(self._log(actor)).data
        self.assertEqual(data["actor_name"], "Ada Lovelace")

    def test_actor_name_falls_back_to_email(self):
        actor = OrgUser.objects.create(organization=self.org, email="b@x.com", name="")
        data = AuditLogSerializer(self._log(actor)).data
        self.assertEqual(data["actor_name"], "b@x.com")

    def test_null_actor_is_blank(self):
        data = AuditLogSerializer(self._log(None)).data
        self.assertEqual(data["actor_name"], "")
