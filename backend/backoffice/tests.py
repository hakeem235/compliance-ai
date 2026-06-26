from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from audit.models import AuditLog
from billing.models import Subscription
from organizations.models import Organization, OrgUser

from .models import PlatformAdmin
from .permissions import is_platform_admin


def _make_org_user(org, clerk_id, role="owner", email="u@x.com"):
    return OrgUser.objects.create(organization=org, clerk_user_id=clerk_id, role=role, email=email)


class PlatformAdminPermissionTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Acme")
        self.regular = _make_org_user(self.org, "user_regular", role="owner")
        self.staff = _make_org_user(self.org, "user_staff", role="member", email="staff@us.com")
        PlatformAdmin.objects.create(clerk_user_id="user_staff", email="staff@us.com")

    def test_regular_org_owner_is_not_platform_admin(self):
        # Being an org owner/admin grants NO platform access — separate boundary.
        self.assertFalse(is_platform_admin(self.regular))

    def test_listed_user_is_platform_admin(self):
        self.assertTrue(is_platform_admin(self.staff))

    @override_settings(PLATFORM_ADMIN_CLERK_IDS="user_bootstrap")
    def test_bootstrap_env_allowlist_grants_access(self):
        u = _make_org_user(self.org, "user_bootstrap", email="b@us.com")
        self.assertTrue(is_platform_admin(u))

    def test_none_user_denied(self):
        self.assertFalse(is_platform_admin(None))


class BackofficeApiSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org_a = Organization.objects.create(name="Alpha Corp")
        self.org_b = Organization.objects.create(name="Beta LLC")
        self.regular = _make_org_user(self.org_a, "regular_1", role="owner")
        self.admin = _make_org_user(self.org_a, "admin_1", role="member", email="ops@us.com")
        PlatformAdmin.objects.create(clerk_user_id="admin_1")

    def test_non_platform_admin_gets_403_on_clients(self):
        self.client.force_authenticate(user=self.regular)
        resp = self.client.get("/api/backoffice/clients/")
        self.assertEqual(resp.status_code, 403)

    def test_unauthenticated_denied(self):
        resp = self.client.get("/api/backoffice/clients/")
        self.assertIn(resp.status_code, (401, 403))

    def test_platform_admin_sees_all_clients_cross_tenant(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/backoffice/clients/")
        self.assertEqual(resp.status_code, 200)
        names = {c["name"] for c in resp.json()}
        self.assertEqual(names, {"Alpha Corp", "Beta LLC"})

    def test_client_search_filters_by_name(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/backoffice/clients/?q=beta")
        self.assertEqual([c["name"] for c in resp.json()], ["Beta LLC"])

    def test_stats_counts_clients(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/backoffice/stats/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total_clients"], 2)

    def test_client_detail_returns_members_and_subscription(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(f"/api/backoffice/clients/{self.org_a.id}/")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["name"], "Alpha Corp")
        self.assertEqual(body["subscription"]["status"], "none")
        self.assertTrue(len(body["members"]) >= 1)


class BackofficeMutationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Gamma")
        self.admin = _make_org_user(self.org, "admin_x", email="ops@us.com")
        PlatformAdmin.objects.create(clerk_user_id="admin_x")
        self.client.force_authenticate(user=self.admin)

    def test_change_plan_calls_service_and_audits(self):
        with mock.patch("backoffice.services.change_plan", return_value={"plan": "growth", "status": "active"}) as m:
            resp = self.client.post(
                f"/api/backoffice/clients/{self.org.id}/change-plan/", {"plan": "growth"}, format="json"
            )
        self.assertEqual(resp.status_code, 200)
        m.assert_called_once()
        self.assertTrue(
            AuditLog.objects.filter(organization=self.org, action="platform.change_plan").exists()
        )

    def test_refund_requires_payment_intent(self):
        with mock.patch("backoffice.services.refund_payment", side_effect=ValueError("A payment_intent id is required to refund.")):
            resp = self.client.post(f"/api/backoffice/clients/{self.org.id}/refund/", {}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_refund_calls_service_and_audits(self):
        with mock.patch(
            "backoffice.services.refund_payment",
            return_value={"id": "re_1", "status": "succeeded", "amount": 249.0, "currency": "SAR"},
        ) as m:
            resp = self.client.post(
                f"/api/backoffice/clients/{self.org.id}/refund/", {"payment_intent": "pi_123"}, format="json"
            )
        self.assertEqual(resp.status_code, 200)
        m.assert_called_once()
        log = AuditLog.objects.filter(organization=self.org, action="platform.refund").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.resource_id, "pi_123")

    def test_payments_503_when_billing_unconfigured(self):
        from billing.services import BillingNotConfigured

        with mock.patch("backoffice.services.list_payments", side_effect=BillingNotConfigured("Stripe is not configured")):
            resp = self.client.get(f"/api/backoffice/clients/{self.org.id}/payments/")
        self.assertEqual(resp.status_code, 503)


class AddPlatformAdminCommandTests(TestCase):
    def test_command_creates_platform_admin(self):
        from django.core.management import call_command

        call_command("add_platform_admin", clerk_id="user_cmd", email="c@us.com", note="founder")
        self.assertTrue(PlatformAdmin.objects.filter(clerk_user_id="user_cmd").exists())


class SeedDevAdminCommandTests(TestCase):
    def test_seeds_org_user_and_platform_admin(self):
        from django.core.management import call_command

        call_command("seed_dev_admin", clerk_id="user_dev", email="dev@x.com", org_name="Dev Co")
        org_user = OrgUser.objects.get(clerk_user_id="user_dev")
        self.assertEqual(org_user.organization.name, "Dev Co")
        self.assertTrue(PlatformAdmin.objects.filter(clerk_user_id="user_dev").exists())
        self.assertTrue(is_platform_admin(org_user))

    def test_rerun_is_idempotent(self):
        from django.core.management import call_command

        call_command("seed_dev_admin", clerk_id="user_dev", email="dev@x.com")
        call_command("seed_dev_admin", clerk_id="user_dev", email="dev@x.com")
        self.assertEqual(OrgUser.objects.filter(clerk_user_id="user_dev").count(), 1)
        self.assertEqual(PlatformAdmin.objects.filter(clerk_user_id="user_dev").count(), 1)
