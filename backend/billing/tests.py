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


@override_settings(STRIPE_PRICE_IDS={"starter": "price_starter", "growth": "price_growth"})
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
    """PDPL in-Kingdom PSP seam: BILLING_PROVIDER swaps Stripe → Moyasar stub."""

    def setUp(self):
        from billing import services

        self.services = services
        self.org = Organization.objects.create(name="Acme")

    def test_default_provider_is_stripe(self):
        self.assertIsNone(self.services._moyasar())

    @override_settings(BILLING_PROVIDER="moyasar")
    def test_moyasar_selected_returns_module(self):
        self.assertIsNotNone(self.services._moyasar())

    @override_settings(BILLING_PROVIDER="moyasar")
    def test_moyasar_stub_not_implemented_does_not_silently_pass(self):
        from billing.services import BillingNotConfigured

        with self.assertRaises(BillingNotConfigured):
            self.services.create_checkout_session(self.org, "starter", "a@b.com")
        with self.assertRaises(BillingNotConfigured):
            self.services.create_portal_session(self.org)
        with self.assertRaises(BillingNotConfigured):
            self.services.verify_webhook(b"{}", "sig")
