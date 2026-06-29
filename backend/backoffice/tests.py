from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from audit.models import AuditLog
from billing.models import Subscription
from organizations.models import Organization, OrgUser

from .models import PlatformAdmin
from .permissions import is_platform_admin


def _make_org_user(org, email, role="owner"):
    user = OrgUser(organization=org, role=role, email=email)
    user.set_password("password123")
    user.save()
    return user


class PlatformAdminPermissionTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Acme")
        self.regular = _make_org_user(self.org, "regular@x.com", role="owner")
        self.staff = _make_org_user(self.org, "staff@us.com", role="member")
        PlatformAdmin.objects.create(org_user=self.staff, email="staff@us.com")

    def test_regular_org_owner_is_not_platform_admin(self):
        # Being an org owner/admin grants NO platform access — separate boundary.
        self.assertFalse(is_platform_admin(self.regular))

    def test_listed_user_is_platform_admin(self):
        self.assertTrue(is_platform_admin(self.staff))

    @override_settings(PLATFORM_ADMIN_EMAILS="bootstrap@us.com")
    def test_bootstrap_env_allowlist_grants_access(self):
        u = _make_org_user(self.org, "bootstrap@us.com")
        self.assertTrue(is_platform_admin(u))

    def test_none_user_denied(self):
        self.assertFalse(is_platform_admin(None))


class BackofficeApiSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org_a = Organization.objects.create(name="Alpha Corp")
        self.org_b = Organization.objects.create(name="Beta LLC")
        self.regular = _make_org_user(self.org_a, "regular@a.com", role="owner")
        self.admin = _make_org_user(self.org_a, "ops@us.com", role="member")
        PlatformAdmin.objects.create(org_user=self.admin)

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
        names = {c["name"] for c in resp.json()["results"]}
        self.assertEqual(names, {"Alpha Corp", "Beta LLC"})
        self.assertEqual(resp.json()["total"], 2)

    def test_client_search_filters_by_name(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/backoffice/clients/?q=beta")
        self.assertEqual([c["name"] for c in resp.json()["results"]], ["Beta LLC"])

    def test_pagination_limits_results(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/backoffice/clients/?page=1&page_size=1")
        body = resp.json()
        self.assertEqual(len(body["results"]), 1)
        self.assertTrue(body["has_next"])

    def test_csv_export(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/backoffice/clients/export/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/csv", resp["Content-Type"])
        self.assertIn("Alpha Corp", resp.content.decode())

    def test_csv_export_neutralizes_formula_injection(self):
        Organization.objects.create(name="=HYPERLINK(\"http://evil\")")
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/backoffice/clients/export/")
        body = resp.content.decode()
        # The dangerous name must be quoted/escaped so it can't start with '='.
        self.assertIn("'=HYPERLINK", body)
        self.assertNotRegex(body, r"(^|,)=HYPERLINK")

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
        self.admin = _make_org_user(self.org, "ops@us.com")
        PlatformAdmin.objects.create(org_user=self.admin)
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


class BackofficeCompleteFeatureTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Delta")
        self.admin = _make_org_user(self.org, "admin_d", email="ops@us.com")
        self.member = _make_org_user(self.org, "member_d", role="member", email="m@delta.com")
        PlatformAdmin.objects.create(clerk_user_id="admin_d")
        self.client.force_authenticate(user=self.admin)

    def test_suspend_and_restore(self):
        r = self.client.post(f"/api/backoffice/clients/{self.org.id}/suspend/", {"suspend": True}, format="json")
        self.assertEqual(r.status_code, 200)
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_suspended)
        self.assertIsNotNone(self.org.suspended_at)
        self.assertTrue(AuditLog.objects.filter(organization=self.org, action="platform.suspend").exists())
        r = self.client.post(f"/api/backoffice/clients/{self.org.id}/suspend/", {"suspend": False}, format="json")
        self.org.refresh_from_db()
        self.assertFalse(self.org.is_suspended)

    def test_update_notes(self):
        r = self.client.put(f"/api/backoffice/clients/{self.org.id}/notes/", {"notes": "VIP client"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.org.refresh_from_db()
        self.assertEqual(self.org.internal_notes, "VIP client")

    def test_change_member_role(self):
        r = self.client.patch(
            f"/api/backoffice/clients/{self.org.id}/members/{self.member.id}/", {"role": "legal_reviewer"}, format="json"
        )
        self.assertEqual(r.status_code, 200)
        self.member.refresh_from_db()
        self.assertEqual(self.member.role, "legal_reviewer")

    def test_change_member_role_rejects_invalid(self):
        r = self.client.patch(
            f"/api/backoffice/clients/{self.org.id}/members/{self.member.id}/", {"role": "bogus"}, format="json"
        )
        self.assertEqual(r.status_code, 400)

    def test_remove_member(self):
        r = self.client.delete(f"/api/backoffice/clients/{self.org.id}/members/{self.member.id}/")
        self.assertEqual(r.status_code, 204)
        self.assertFalse(OrgUser.objects.filter(id=self.member.id).exists())

    def test_cannot_remove_last_member(self):
        OrgUser.objects.filter(id=self.member.id).delete()
        r = self.client.delete(f"/api/backoffice/clients/{self.org.id}/members/{self.admin.id}/")
        self.assertEqual(r.status_code, 400)

    def test_comp_plan_no_stripe(self):
        r = self.client.post(f"/api/backoffice/clients/{self.org.id}/comp-plan/", {"plan": "enterprise"}, format="json")
        self.assertEqual(r.status_code, 200)
        sub = Subscription.objects.get(organization=self.org)
        self.assertEqual(sub.plan, "enterprise")
        self.assertTrue(sub.comped)
        self.assertEqual(sub.status, "active")

    def test_client_audit_timeline(self):
        self.client.post(f"/api/backoffice/clients/{self.org.id}/suspend/", {"suspend": True}, format="json")
        r = self.client.get(f"/api/backoffice/clients/{self.org.id}/audit/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(any(log["action"] == "platform.suspend" for log in r.json()))

    def test_platform_wide_audit(self):
        self.client.post(f"/api/backoffice/clients/{self.org.id}/comp-plan/", {"plan": "growth"}, format="json")
        r = self.client.get("/api/backoffice/audit/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(all(log["metadata"].get("platform_action") for log in r.json()))

    def test_manage_platform_admins(self):
        r = self.client.post("/api/backoffice/admins/", {"clerk_user_id": "new_staff", "email": "s@us.com"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertTrue(PlatformAdmin.objects.filter(clerk_user_id="new_staff").exists())
        new_id = r.json()["id"]
        r = self.client.delete(f"/api/backoffice/admins/{new_id}/")
        self.assertEqual(r.status_code, 204)

    def test_cannot_remove_last_platform_admin(self):
        only = PlatformAdmin.objects.get(clerk_user_id="admin_d")
        r = self.client.delete(f"/api/backoffice/admins/{only.id}/")
        self.assertEqual(r.status_code, 400)


class SuspensionEnforcementTests(TestCase):
    def test_suspended_org_member_is_blocked_at_auth(self):
        from rest_framework import exceptions

        from organizations.authentication import ClerkJWTAuthentication

        org = Organization.objects.create(name="Suspended Inc", is_suspended=True)
        OrgUser.objects.create(organization=org, clerk_user_id="blocked_user", email="b@x.com")
        auth = ClerkJWTAuthentication()
        with mock.patch.object(auth, "_verify_token", return_value={"sub": "blocked_user"}):
            req = mock.Mock(headers={"Authorization": "Bearer t"})
            with override_settings(CLERK_SECRET_KEY="x", CLERK_JWT_ISSUER="https://i"):
                with self.assertRaises(exceptions.AuthenticationFailed):
                    auth.authenticate(req)


class AddPlatformAdminCommandTests(TestCase):
    def test_command_creates_platform_admin(self):
        from django.core.management import call_command

        org = Organization.objects.create(name="Cmd Co")
        _make_org_user(org, "c@us.com")
        call_command("add_platform_admin", email="c@us.com", note="founder")
        self.assertTrue(PlatformAdmin.objects.filter(email="c@us.com").exists())


class SeedDevAdminCommandTests(TestCase):
    def test_seeds_org_user_and_platform_admin(self):
        from django.core.management import call_command

        call_command("seed_dev_admin", email="dev@x.com", password="password123", org_name="Dev Co")
        org_user = OrgUser.objects.get(email="dev@x.com")
        self.assertEqual(org_user.organization.name, "Dev Co")
        self.assertTrue(PlatformAdmin.objects.filter(org_user=org_user).exists())
        self.assertTrue(is_platform_admin(org_user))
        self.assertTrue(org_user.check_password("password123"))

    def test_rerun_is_idempotent(self):
        from django.core.management import call_command

        call_command("seed_dev_admin", email="dev@x.com", password="password123")
        call_command("seed_dev_admin", email="dev@x.com", password="password123")
        self.assertEqual(OrgUser.objects.filter(email="dev@x.com").count(), 1)
        self.assertEqual(PlatformAdmin.objects.filter(org_user__email="dev@x.com").count(), 1)
