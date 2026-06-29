"""Moyasar (in-Kingdom, SAMA-aligned PSP) billing provider.

Replaces Stripe for the PDPL in-Kingdom-payments fix. Uses the Moyasar Invoices
API: checkout creates an invoice (a hosted payment page) for the plan amount and
returns its URL; when the customer pays, Moyasar POSTs a webhook (event `type`
+ a `secret_token`) which activates the subscription for the period.

Called over stdlib `urllib` (no SDK), consistent with the rest of the app.
Inert until MOYASAR_SECRET_KEY is set (checkout 503s, like the Stripe path did).
"""

import base64
import hmac
import json
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

from django.conf import settings

from .models import Subscription
from .plans import PLANS
from .services import BillingError, BillingNotConfigured, get_or_create_subscription

# A paid plan grants access for this many days; renewal is a fresh invoice.
PERIOD_DAYS = 30
# Moyasar webhook events that mean "money received".
_PAID_EVENTS = {"payment_paid", "invoice_paid"}


def _require_keys() -> None:
    if not settings.MOYASAR_SECRET_KEY:
        raise BillingNotConfigured("Moyasar is not configured (MOYASAR_SECRET_KEY missing).")


def _auth_header() -> str:
    # HTTP Basic: secret key as username, blank password.
    token = base64.b64encode(f"{settings.MOYASAR_SECRET_KEY}:".encode()).decode()
    return f"Basic {token}"


def _post_invoice(body: dict) -> dict:
    url = f"{settings.MOYASAR_BASE_URL.rstrip('/')}/invoices"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        method="POST",
        headers={"Authorization": _auth_header(), "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:300]
        raise BillingError(f"Moyasar rejected the invoice (HTTP {exc.code}): {detail}") from exc
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise BillingError(f"Could not reach Moyasar: {exc}") from exc


def create_checkout_session(organization, plan_key: str, email: str) -> str:
    """Create a Moyasar invoice for the plan and return its hosted-page URL."""
    _require_keys()
    plan = PLANS.get(plan_key)
    if not plan or not plan.get("checkout") or not plan.get("price_sar"):
        raise BillingNotConfigured(f"No self-serve Moyasar price for plan '{plan_key}'.")

    # Ensure a Subscription row exists so the webhook can reconcile onto it.
    get_or_create_subscription(organization)
    return_url = settings.BILLING_RETURN_URL

    body = {
        "amount": int(plan["price_sar"]) * 100,  # SAR -> halalas
        "currency": "SAR",
        "description": f"{plan['name']} plan — {organization.name}",
        "success_url": f"{return_url}?checkout=success",
        "back_url": f"{return_url}?checkout=cancelled",
        # Propagated onto the payment so the webhook knows who/what to activate.
        "metadata": {"organization_id": str(organization.id), "plan": plan_key, "email": email or ""},
    }
    # Per-invoice callback is optional; a dashboard-configured webhook also fires.
    # Only send it when we have a publicly reachable URL configured.
    if settings.MOYASAR_CALLBACK_URL:
        body["callback_url"] = settings.MOYASAR_CALLBACK_URL

    invoice = _post_invoice(body)
    url = invoice.get("url")
    if not url:
        raise BillingError("Moyasar did not return a payment URL.")
    return url


def create_portal_session(organization) -> str:
    """Moyasar has no hosted billing portal — surface that clearly so the UI can
    hide the 'manage' action rather than dead-ending on it."""
    raise BillingNotConfigured("Moyasar has no billing portal. Manage your plan in-app or contact support.")


def verify_webhook(payload: bytes, signature: str):
    """Parse the Moyasar webhook body and authenticate it by comparing the
    body's `secret_token` to the configured shared secret (constant-time)."""
    try:
        event = json.loads(payload or b"{}")
    except ValueError as exc:
        raise ValueError(f"Invalid webhook body: {exc}") from exc

    expected = settings.MOYASAR_WEBHOOK_SECRET
    if expected:
        provided = str(event.get("secret_token") or "")
        if not hmac.compare_digest(provided, expected):
            raise ValueError("Webhook secret_token mismatch.")
    return event


def apply_subscription_event(event: dict) -> None:
    """Activate the subscription when a Moyasar payment for a plan succeeds."""
    if event.get("type") not in _PAID_EVENTS:
        return
    data = event.get("data") or {}
    if (data.get("status") or "").lower() != "paid":
        return

    metadata = data.get("metadata") or {}
    org_id = metadata.get("organization_id")
    plan_key = metadata.get("plan")
    if not org_id or plan_key not in PLANS:
        return

    sub = Subscription.objects.filter(organization_id=org_id).first()
    if not sub:
        return
    sub.plan = plan_key
    sub.status = "active"
    sub.comped = False
    # Store the Moyasar payment id as the provider reference.
    sub.stripe_subscription_id = str(data.get("id") or "")
    sub.current_period_end = datetime.now(timezone.utc) + timedelta(days=PERIOD_DAYS)
    sub.save()
