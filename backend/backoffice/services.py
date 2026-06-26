"""
Platform back-office billing operations (cross-tenant). All Stripe SDK calls
go through billing.services' configuration boundary; these add the staff-only
mutations the customer-facing billing app deliberately doesn't expose.

Every function raises BillingNotConfigured when Stripe isn't set up, so views
degrade to a clear 503 rather than throwing.
"""

import stripe

from billing.models import Subscription
from billing.plans import PLANS, plan_for_price_id, price_id_for
from billing.services import BillingNotConfigured, _client, get_or_create_subscription


def _require_stripe_subscription(organization) -> tuple[Subscription, str]:
    sub = get_or_create_subscription(organization)
    if not sub.stripe_subscription_id:
        raise BillingNotConfigured("This client has no active Stripe subscription.")
    return sub, sub.stripe_subscription_id


def change_plan(organization, plan_key: str) -> dict:
    """Switch a client's subscription to a different plan (prorated by Stripe)."""
    _client()
    if plan_key not in PLANS:
        raise ValueError(f"Unknown plan '{plan_key}'.")
    price_id = price_id_for(plan_key)
    if not price_id:
        raise BillingNotConfigured(f"No Stripe price configured for plan '{plan_key}'.")
    sub, stripe_sub_id = _require_stripe_subscription(organization)
    stripe_sub = stripe.Subscription.retrieve(stripe_sub_id)
    item_id = stripe_sub["items"]["data"][0]["id"]
    updated = stripe.Subscription.modify(
        stripe_sub_id,
        items=[{"id": item_id, "price": price_id}],
        proration_behavior="create_prorations",
        cancel_at_period_end=False,
    )
    sub.plan = plan_for_price_id(price_id) or plan_key
    sub.status = "active"
    sub.save(update_fields=["plan", "status", "updated_at"])
    return {"plan": sub.plan, "status": updated.get("status", sub.status)}


def cancel_subscription(organization, at_period_end: bool = True) -> dict:
    """Cancel a client's subscription, at period end by default."""
    _client()
    sub, stripe_sub_id = _require_stripe_subscription(organization)
    if at_period_end:
        stripe.Subscription.modify(stripe_sub_id, cancel_at_period_end=True)
        sub.status = "active"  # remains active until the period actually ends
    else:
        stripe.Subscription.delete(stripe_sub_id)
        sub.status = "canceled"
        sub.plan = ""
    sub.save(update_fields=["plan", "status", "updated_at"])
    return {"status": sub.status, "cancel_at_period_end": at_period_end}


def reactivate_subscription(organization) -> dict:
    """Undo a pending period-end cancellation."""
    _client()
    sub, stripe_sub_id = _require_stripe_subscription(organization)
    stripe.Subscription.modify(stripe_sub_id, cancel_at_period_end=False)
    sub.status = "active"
    sub.save(update_fields=["status", "updated_at"])
    return {"status": sub.status}


def list_payments(organization, limit: int = 20) -> list[dict]:
    """Recent invoices for a client's Stripe customer."""
    _client()
    sub = get_or_create_subscription(organization)
    if not sub.stripe_customer_id:
        return []
    invoices = stripe.Invoice.list(customer=sub.stripe_customer_id, limit=limit)
    return [
        {
            "id": inv["id"],
            "number": inv.get("number"),
            "amount_paid": (inv.get("amount_paid") or 0) / 100,
            "currency": (inv.get("currency") or "").upper(),
            "status": inv.get("status"),
            "created": inv.get("created"),
            "hosted_invoice_url": inv.get("hosted_invoice_url"),
            "payment_intent": inv.get("payment_intent"),
        }
        for inv in invoices.get("data", [])
    ]


def refund_payment(payment_intent_id: str, amount=None) -> dict:
    """Issue a refund against a PaymentIntent. `amount` (major units) is
    optional; omitting it refunds the full amount."""
    _client()
    if not payment_intent_id:
        raise ValueError("A payment_intent id is required to refund.")
    params = {"payment_intent": payment_intent_id}
    if amount is not None:
        params["amount"] = int(round(float(amount) * 100))
    refund = stripe.Refund.create(**params)
    return {
        "id": refund["id"],
        "status": refund.get("status"),
        "amount": (refund.get("amount") or 0) / 100,
        "currency": (refund.get("currency") or "").upper(),
    }
