import json
from django.test import TestCase, override_settings

from organizations.models import Organization

from .models import Subscription
from .plans import FREE_REVIEWS_PER_MONTH, plan_for_price_id, price_id_for, reviews_limit_for
from .services import apply_subscription_event


class ReviewUsageTests(TestCase):
    def setUp(self):
        from documents.models import Document, DocumentAnalysis

        self.Document = Document
        self.DocumentAnalysis = DocumentAnalysis
        self.org = Organization.objects.create(name="Acme")

    def _run_analyses(self, n):
        doc = self.Document.objects.create(organization=self.org, filename="c.txt", file_type="txt", s3_key="k")
        for _ in range(n):
            self.DocumentAnalysis.objects.create(document=doc, status="completed")

    def test_free_tier_limit_reached(self):
        from .plans import FREE_REVIEWS_PER_MONTH
        from .usage import review_limit_reached, review_usage

        self._run_analyses(FREE_REVIEWS_PER_MONTH)
        usage = review_usage(self.org)
        self.assertEqual(usage["used"], FREE_REVIEWS_PER_MONTH)
        self.assertEqual(usage["limit"], FREE_REVIEWS_PER_MONTH)
        self.assertTrue(review_limit_reached(self.org))

    def test_under_limit_not_reached(self):
        from .usage import review_limit_reached

        self._run_analyses(2)
        self.assertFalse(review_limit_reached(self.org))

    def test_unlimited_plan_never_reached(self):
        from .usage import review_limit_reached

        sub, _ = Subscription.objects.get_or_create(organization=self.org)
        sub.plan = "enterprise"
        sub.save()
        self._run_analyses(50)
        self.assertFalse(review_limit_reached(self.org))


class ReviewsLimitTests(TestCase):
    def test_known_plans(self):
        self.assertEqual(reviews_limit_for("starter"), 50)
        self.assertEqual(reviews_limit_for("growth"), 500)
        self.assertIsNone(reviews_limit_for("enterprise"))  # unlimited

    def test_no_plan_uses_free_allowance(self):
        self.assertEqual(reviews_limit_for(""), FREE_REVIEWS_PER_MONTH)
        self.assertEqual(reviews_limit_for("unknown"), FREE_REVIEWS_PER_MONTH)


@override_settings(STRIPE_PRICE_IDS={"starter": "price_starter", "growth": "price_growth"})
class PlanMappingTests(TestCase):
    def test_price_id_lookup(self):
        self.assertEqual(price_id_for("growth"), "price_growth")
        self.assertEqual(price_id_for("unknown"), "")

    def test_reverse_lookup(self):
        self.assertEqual(plan_for_price_id("price_starter"), "starter")
        self.assertEqual(plan_for_price_id("price_missing"), "")

    def test_blank_price_id_does_not_match(self):
        # An unconfigured (blank) price must not match a blank lookup.
        self.assertEqual(plan_for_price_id(""), "")


@override_settings(BILLING_PROVIDER="stripe", STRIPE_PRICE_IDS={"starter": "price_starter", "growth": "price_growth"})
class ApplySubscriptionEventTests(TestCase):
    def _sub(self):
        org = Organization.objects.create(name="Acme")
        return Subscription.objects.create(organization=org, stripe_customer_id="cus_123")

    def test_active_subscription_sets_plan_and_status(self):
        sub = self._sub()
        apply_subscription_event(
            {
                "id": "sub_1",
                "customer": "cus_123",
                "status": "active",
                "current_period_end": 1893456000,
                "items": {"data": [{"price": {"id": "price_growth"}}]},
            }
        )
        sub.refresh_from_db()
        self.assertEqual(sub.plan, "growth")
        self.assertEqual(sub.status, "active")
        self.assertIsNotNone(sub.current_period_end)

    def test_canceled_clears_plan(self):
        sub = self._sub()
        sub.plan = "growth"
        sub.status = "active"
        sub.save()
        apply_subscription_event(
            {"id": "sub_1", "customer": "cus_123", "status": "canceled", "items": {"data": []}}
        )
        sub.refresh_from_db()
        self.assertEqual(sub.plan, "")
        self.assertEqual(sub.status, "canceled")

    def test_unknown_customer_is_ignored(self):
        # No row for this customer → no crash, nothing created.
        apply_subscription_event({"id": "sub_x", "customer": "cus_nope", "status": "active", "items": {"data": []}})
        self.assertEqual(Subscription.objects.filter(stripe_customer_id="cus_nope").count(), 0)


class BillingProviderSeamTests(TestCase):
    """BILLING_PROVIDER selects Moyasar (default, in-Kingdom) or Stripe."""

    def setUp(self):
        from billing import services

        self.services = services
        self.org = Organization.objects.create(name="Acme")

    def test_default_provider_is_moyasar(self):
        self.assertEqual(self.services.provider_name(), "moyasar")
        self.assertIsNotNone(self.services._moyasar())
        self.assertFalse(self.services.portal_supported())  # Moyasar has no portal

    @override_settings(BILLING_PROVIDER="stripe")
    def test_stripe_selectable(self):
        self.assertEqual(self.services.provider_name(), "stripe")
        self.assertIsNone(self.services._moyasar())
        self.assertTrue(self.services.portal_supported())

    @override_settings(BILLING_PROVIDER="moyasar", MOYASAR_SECRET_KEY="")
    @override_settings(FRONTEND_BASE_URL="http://localhost:3000")
    def test_checkout_returns_pay_page_without_secret_key(self):
        # The in-page (Moyasar.js) flow only needs the publishable key on the
        # frontend, so checkout works (returns our /pay URL) with no secret key.
        url = self.services.create_checkout_session(self.org, "starter", "a@b.com")
        self.assertEqual(url, "http://localhost:3000/pay?plan=starter")

    def test_portal_unsupported_without_key(self):
        from billing.services import BillingNotConfigured

        with self.assertRaises(BillingNotConfigured):
            self.services.create_portal_session(self.org)


@override_settings(BILLING_PROVIDER="moyasar", MOYASAR_BASE_URL="https://api.moyasar.com/v1", FRONTEND_BASE_URL="http://localhost:3000")
class MoyasarProviderTests(TestCase):
    def setUp(self):
        from billing import moyasar

        self.moyasar = moyasar
        self.org = Organization.objects.create(name="Acme")

    def test_checkout_returns_in_app_pay_url(self):
        url = self.moyasar.create_checkout_session(self.org, "starter", "a@b.com")
        self.assertEqual(url, "http://localhost:3000/pay?plan=starter")

    def test_portal_unsupported(self):
        from billing.services import BillingNotConfigured

        with self.assertRaises(BillingNotConfigured):
            self.moyasar.create_portal_session(self.org)

    def test_confirm_without_secret_key_trusts_and_activates(self):
        # Publishable-only (dev/test): no server verification, plan activates.
        Subscription.objects.create(organization=self.org)
        self.moyasar.confirm_payment(self.org, "starter", "pay_abc")
        sub = Subscription.objects.get(organization=self.org)
        self.assertEqual(sub.plan, "starter")
        self.assertEqual(sub.status, "active")
        self.assertEqual(sub.stripe_subscription_id, "pay_abc")

    @override_settings(MOYASAR_SECRET_KEY="sk_test_x")
    def test_confirm_with_secret_key_verifies_payment(self):
        from unittest import mock
        import io

        Subscription.objects.create(organization=self.org)

        class _Resp(io.BytesIO):
            def __enter__(self):
                return self
            def __exit__(self, *a):
                return False

        # Verified paid payment of the right amount → activates.
        ok = json.dumps({"id": "pay_1", "status": "paid", "amount": 24900, "currency": "SAR"}).encode()
        with mock.patch.object(self.moyasar.urllib.request, "urlopen", return_value=_Resp(ok)):
            self.moyasar.confirm_payment(self.org, "starter", "pay_1")
        self.assertEqual(Subscription.objects.get(organization=self.org).status, "active")

        # Unpaid payment → rejected, plan unchanged.
        from billing.services import BillingError

        bad = json.dumps({"id": "pay_2", "status": "failed", "amount": 24900, "currency": "SAR"}).encode()
        with mock.patch.object(self.moyasar.urllib.request, "urlopen", return_value=_Resp(bad)):
            with self.assertRaises(BillingError):
                self.moyasar.confirm_payment(self.org, "growth", "pay_2")

    def test_confirm_requires_payment_id(self):
        with self.assertRaises(ValueError):
            self.moyasar.confirm_payment(self.org, "starter", "")

    @override_settings(MOYASAR_WEBHOOK_SECRET="whsec_123")
    def test_webhook_secret_token_verified(self):
        good = json.dumps({"type": "payment_paid", "secret_token": "whsec_123", "data": {}}).encode()
        self.assertEqual(self.moyasar.verify_webhook(good, "")["type"], "payment_paid")

        bad = json.dumps({"type": "payment_paid", "secret_token": "wrong", "data": {}}).encode()
        with self.assertRaises(ValueError):
            self.moyasar.verify_webhook(bad, "")

    def test_paid_event_activates_subscription(self):
        Subscription.objects.create(organization=self.org)
        event = {
            "type": "payment_paid",
            "data": {
                "id": "pay_1",
                "status": "paid",
                "metadata": {"organization_id": str(self.org.id), "plan": "growth"},
            },
        }
        self.moyasar.apply_subscription_event(event)
        sub = Subscription.objects.get(organization=self.org)
        self.assertEqual(sub.plan, "growth")
        self.assertEqual(sub.status, "active")
        self.assertIsNotNone(sub.current_period_end)
        self.assertEqual(sub.stripe_subscription_id, "pay_1")

    def test_unpaid_event_is_ignored(self):
        Subscription.objects.create(organization=self.org)
        self.moyasar.apply_subscription_event(
            {"type": "payment_failed", "data": {"status": "failed", "metadata": {"organization_id": str(self.org.id), "plan": "growth"}}}
        )
        self.assertEqual(Subscription.objects.get(organization=self.org).status, "none")

    @override_settings(MOYASAR_WEBHOOK_SECRET="whsec_123")
    def test_webhook_endpoint_end_to_end(self):
        from rest_framework.test import APIClient

        Subscription.objects.create(organization=self.org)
        body = {
            "type": "payment_paid",
            "secret_token": "whsec_123",
            "data": {"id": "pay_9", "status": "paid", "metadata": {"organization_id": str(self.org.id), "plan": "starter"}},
        }
        resp = APIClient().post("/api/billing/webhook/", body, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Subscription.objects.get(organization=self.org).plan, "starter")
