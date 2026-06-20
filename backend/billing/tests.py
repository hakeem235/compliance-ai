from django.test import TestCase, override_settings

from organizations.models import Organization

from .models import Subscription
from .plans import plan_for_price_id, price_id_for
from .services import apply_subscription_event


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
