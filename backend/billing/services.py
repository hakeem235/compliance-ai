"""Stripe integration boundary. All direct Stripe SDK calls live here so the
views stay thin and the rest of the app never imports stripe directly."""

from datetime import datetime, timezone

import stripe
from django.conf import settings

from .models import Subscription
from .plans import plan_for_price_id, price_id_for


class BillingNotConfigured(Exception):
    """Raised when Stripe keys/price IDs aren't set in the environment."""


def _client() -> None:
    if not settings.STRIPE_SECRET_KEY:
        raise BillingNotConfigured("Stripe is not configured (STRIPE_SECRET_KEY missing).")
    stripe.api_key = settings.STRIPE_SECRET_KEY


def get_or_create_subscription(organization) -> Subscription:
    sub, _ = Subscription.objects.get_or_create(organization=organization)
    return sub


def _ensure_customer(sub: Subscription, organization, email: str) -> str:
    if sub.stripe_customer_id:
        return sub.stripe_customer_id
    customer = stripe.Customer.create(
        email=email or None,
        name=organization.name,
        metadata={"organization_id": str(organization.id)},
    )
    sub.stripe_customer_id = customer["id"]
    sub.save(update_fields=["stripe_customer_id"])
    return customer["id"]


def create_checkout_session(organization, plan_key: str, email: str) -> str:
    """Create a Stripe Checkout Session for a plan; returns the redirect URL."""
    _client()
    price_id = price_id_for(plan_key)
    if not price_id:
        raise BillingNotConfigured(f"No Stripe price configured for plan '{plan_key}'.")
    sub = get_or_create_subscription(organization)
    customer_id = _ensure_customer(sub, organization, email)
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=settings.STRIPE_BILLING_RETURN_URL + "?checkout=success",
        cancel_url=settings.STRIPE_BILLING_RETURN_URL + "?checkout=cancelled",
        metadata={"organization_id": str(organization.id), "plan": plan_key},
    )
    return session["url"]


def create_portal_session(organization) -> str:
    """Create a Stripe billing-portal session; returns the redirect URL."""
    _client()
    sub = get_or_create_subscription(organization)
    if not sub.stripe_customer_id:
        raise BillingNotConfigured("No Stripe customer for this organization yet — subscribe to a plan first.")
    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=settings.STRIPE_BILLING_RETURN_URL,
    )
    return session["url"]


def verify_webhook(payload: bytes, signature: str):
    """Verify a Stripe webhook signature and return the parsed event."""
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise BillingNotConfigured("Stripe webhook secret not configured.")
    return stripe.Webhook.construct_event(payload, signature, settings.STRIPE_WEBHOOK_SECRET)


def _period_end(epoch) -> datetime | None:
    return datetime.fromtimestamp(epoch, tz=timezone.utc) if epoch else None


def apply_subscription_event(stripe_subscription: dict) -> None:
    """Sync a Stripe subscription object onto our Subscription row."""
    customer_id = stripe_subscription.get("customer")
    sub = Subscription.objects.filter(stripe_customer_id=customer_id).first()
    if not sub:
        return
    status = stripe_subscription.get("status", "")
    items = (stripe_subscription.get("items") or {}).get("data") or []
    price_id = items[0]["price"]["id"] if items else ""
    sub.stripe_subscription_id = stripe_subscription.get("id", "") or sub.stripe_subscription_id
    sub.plan = plan_for_price_id(price_id) or sub.plan
    sub.status = "active" if status in ("active", "trialing") else "past_due" if status == "past_due" else "canceled" if status in ("canceled", "unpaid") else sub.status
    sub.current_period_end = _period_end(stripe_subscription.get("current_period_end"))
    if status in ("canceled", "unpaid"):
        sub.plan = ""
    sub.save()
