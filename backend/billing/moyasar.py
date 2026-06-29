"""Moyasar (in-Kingdom, SAMA-aligned PSP) billing provider.

Replaces Stripe for the PDPL in-Kingdom-payments fix. Uses Moyasar's in-page
payment form (Moyasar.js), which is driven by the PUBLISHABLE key on the
frontend — card data never touches our server (PCI-safe). Flow:

  checkout  -> returns our /pay page URL; the frontend mounts Moyasar.js there
  pay       -> customer pays; Moyasar redirects back with the payment `id`
  confirm   -> we activate the subscription. If MOYASAR_SECRET_KEY is set we
               fetch the payment from Moyasar and verify status/amount first;
               otherwise (publishable-key-only dev/test) we trust the redirect.
  webhook   -> Moyasar also POSTs a `secret_token`-authenticated event we apply.

Called over stdlib `urllib` (no SDK), consistent with the rest of the app.
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

# A paid plan grants access for this many days; renewal is a fresh payment.
PERIOD_DAYS = 30
_PAID_STATUSES = {"paid", "captured", "authorized"}
_PAID_EVENTS = {"payment_paid", "invoice_paid"}


def _auth_header() -> str:
    # HTTP Basic: secret key as username, blank password (server-side only).
    token = base64.b64encode(f"{settings.MOYASAR_SECRET_KEY}:".encode()).decode()
    return f"Basic {token}"


def create_checkout_session(organization, plan_key: str, email: str) -> str:
    """Return the URL of our in-app payment page for the plan. The page mounts
    Moyasar.js with the publishable key — no secret key needed to start checkout."""
    plan = PLANS.get(plan_key)
    if not plan or not plan.get("checkout") or not plan.get("price_sar"):
        raise BillingNotConfigured(f"No self-serve plan '{plan_key}'.")
    # Ensure a Subscription row exists so confirm/webhook can reconcile onto it.
    get_or_create_subscription(organization)
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/pay?plan={plan_key}"


def create_portal_session(organization) -> str:
    """Moyasar has no hosted billing portal — surfaced so the UI hides the action."""
    raise BillingNotConfigured("Moyasar has no billing portal. Manage your plan in-app or contact support.")


def _get_payment(payment_id: str) -> dict:
    url = f"{settings.MOYASAR_BASE_URL.rstrip('/')}/payments/{payment_id}"
    req = urllib.request.Request(url, headers={"Authorization": _auth_header()})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise BillingError(f"Could not verify payment with Moyasar: {exc}") from exc


def _activate(sub: Subscription, plan_key: str, payment_id: str) -> None:
    sub.plan = plan_key
    sub.status = "active"
    sub.comped = False
    sub.stripe_subscription_id = str(payment_id or "")  # provider payment ref
    sub.current_period_end = datetime.now(timezone.utc) + timedelta(days=PERIOD_DAYS)
    sub.save()


def _assert_not_replayed(payment_id: str) -> None:
    """A given Moyasar payment may activate a plan only once."""
    if Subscription.objects.filter(stripe_subscription_id=str(payment_id)).exists():
        raise BillingError("This payment has already been processed.")


def _verify_payment(payment: dict, plan_key: str, organization_id) -> None:
    """Validate a fetched/received Moyasar payment against the plan and org.
    Rejects unpaid, wrong-amount/currency, and cross-org/plan tampering — the
    amount lives client-side in Moyasar.js, so it must be re-checked here."""
    plan = PLANS.get(plan_key)
    if not plan or not plan.get("price_sar"):
        raise BillingError("Unknown plan.")
    if (payment.get("status") or "").lower() not in _PAID_STATUSES:
        raise BillingError(f"Payment is not completed (status: {payment.get('status') or 'unknown'}).")
    if payment.get("amount") != int(plan["price_sar"]) * 100 or (payment.get("currency") or "") != "SAR":
        raise BillingError("Payment amount/currency does not match the plan.")
    metadata = payment.get("metadata") or {}
    if str(metadata.get("organization_id") or "") != str(organization_id) or metadata.get("plan") != plan_key:
        raise BillingError("Payment does not belong to this organization/plan.")


def confirm_payment(organization, plan_key: str, payment_id: str) -> None:
    """Activate the plan after a Moyasar in-page payment. The payment is ALWAYS
    verified server-side against Moyasar (status, amount, currency, org/plan
    binding) and checked for replay — confirmation requires MOYASAR_SECRET_KEY."""
    plan = PLANS.get(plan_key)
    if not plan or not plan.get("price_sar"):
        raise ValueError("Unknown plan.")
    if not payment_id:
        raise ValueError("A payment id is required.")
    if not settings.MOYASAR_SECRET_KEY:
        # Without the secret key we cannot verify the payment is real/paid, so we
        # must NOT activate — refusing beats a free-plan bypass.
        raise BillingNotConfigured(
            "Payment confirmation requires MOYASAR_SECRET_KEY (the publishable key can render the "
            "form but cannot verify payments server-side)."
        )

    payment = _get_payment(payment_id)
    _verify_payment(payment, plan_key, organization.id)
    _assert_not_replayed(payment_id)

    sub = get_or_create_subscription(organization)
    _activate(sub, plan_key, payment_id)


def verify_webhook(payload: bytes, signature: str):
    """Parse the Moyasar webhook body and authenticate it by comparing the body's
    `secret_token` to the configured shared secret (constant-time)."""
    try:
        event = json.loads(payload or b"{}")
    except ValueError as exc:
        raise ValueError(f"Invalid webhook body: {exc}") from exc

    expected = settings.MOYASAR_WEBHOOK_SECRET
    if expected:
        if not hmac.compare_digest(str(event.get("secret_token") or ""), expected):
            raise ValueError("Webhook secret_token mismatch.")
    return event


def apply_subscription_event(event: dict) -> None:
    """Activate the subscription when a Moyasar payment for a plan succeeds. The
    webhook is authenticated by secret_token, but the payment amount still comes
    from a client-set form value, so re-verify amount/plan and block replay."""
    if event.get("type") not in _PAID_EVENTS:
        return
    data = event.get("data") or {}
    metadata = data.get("metadata") or {}
    org_id = metadata.get("organization_id")
    plan_key = metadata.get("plan")
    if not org_id or plan_key not in PLANS:
        return
    sub = Subscription.objects.filter(organization_id=org_id).first()
    if not sub:
        return
    try:
        _verify_payment(data, plan_key, org_id)
        _assert_not_replayed(data.get("id"))
    except BillingError:
        return  # ignore unpaid/tampered/replayed events rather than 500 the webhook
    _activate(sub, plan_key, data.get("id"))
