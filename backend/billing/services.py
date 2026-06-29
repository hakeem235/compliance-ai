"""Stripe integration boundary. All direct Stripe SDK calls live here so the
views stay thin and the rest of the app never imports stripe directly."""

from datetime import datetime, timezone

import stripe
from django.conf import settings

from .models import Subscription
from .plans import plan_for_price_id, price_id_for


class BillingNotConfigured(Exception):
    """Raised when the provider's keys/price IDs aren't set in the environment."""


class BillingError(Exception):
    """Raised when the payment provider returns/transports an error (HTTP, etc.)."""


def _moyasar():
    """The Moyasar provider module when BILLING_PROVIDER=moyasar, else None
    (Stripe). Moyasar is the in-Kingdom PSP for the PDPL payments fix and is the
    default; Stripe stays as a fallback selectable via BILLING_PROVIDER=stripe."""
    if getattr(settings, "BILLING_PROVIDER", "moyasar").lower() == "moyasar":
        from . import moyasar

        return moyasar
    return None


def provider_name() -> str:
    """Active payment provider id (for the frontend to adapt its UI)."""
    return "moyasar" if _moyasar() else "stripe"


def portal_supported() -> bool:
    """Whether the active provider has a hosted billing portal (Moyasar doesn't)."""
    return _moyasar() is None


def billing_enabled() -> bool:
    """Whether the active provider is configured enough to start a checkout."""
    if _moyasar():
        return bool(settings.MOYASAR_SECRET_KEY)
    return bool(settings.STRIPE_SECRET_KEY)


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
    """Create a checkout session for a plan; returns the redirect URL."""
    provider = _moyasar()
    if provider:
        return provider.create_checkout_session(organization, plan_key, email)
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
    """Create a billing-portal session; returns the redirect URL."""
    provider = _moyasar()
    if provider:
        return provider.create_portal_session(organization)
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
    """Verify a webhook signature and return the parsed event."""
    provider = _moyasar()
    if provider:
        return provider.verify_webhook(payload, signature)
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise BillingNotConfigured("Stripe webhook secret not configured.")
    return stripe.Webhook.construct_event(payload, signature, settings.STRIPE_WEBHOOK_SECRET)


def process_webhook(payload: bytes, stripe_signature: str = "") -> None:
    """Provider-aware webhook handler: verify the event and apply it. Keeps the
    view thin and provider-agnostic. Raises BillingNotConfigured (→503) or
    ValueError (→400) on bad/unconfigured input."""
    provider = _moyasar()
    if provider:
        event = provider.verify_webhook(payload, stripe_signature)
        provider.apply_subscription_event(event)
        return

    # --- Stripe ---
    try:
        event = verify_webhook(payload, stripe_signature)
    except stripe.SignatureVerificationError as exc:
        raise ValueError(str(exc)) from exc
    event_type = event["type"]
    obj = event["data"]["object"]
    if event_type in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
        apply_subscription_event(obj)
    elif event_type == "checkout.session.completed" and obj.get("subscription"):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        apply_subscription_event(stripe.Subscription.retrieve(obj["subscription"]))


def _period_end(epoch) -> datetime | None:
    return datetime.fromtimestamp(epoch, tz=timezone.utc) if epoch else None


def apply_subscription_event(stripe_subscription: dict) -> None:
    """Sync a subscription object onto our Subscription row."""
    provider = _moyasar()
    if provider:
        return provider.apply_subscription_event(stripe_subscription)
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
