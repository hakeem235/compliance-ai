"""Moyasar (in-Kingdom, SAMA-aligned PSP) billing provider — STUB.

This is the swap target for the PDPL cross-border-payments fix: Stripe has no
KSA entity, so recurring billing PII leaves the Kingdom on every call. Moyasar
is the recommended replacement (see docs/PDPL_PROCESSOR_EVALUATION.md §1).

NOT IMPLEMENTED. The migration plan (token-driven recurring, webhook reconcile
to the existing Subscription row) is written but deliberately not built — Ahmed
decides the PSP before we wire a live integration. This module exists so the
billing interface is demonstrably swappable behind `BILLING_PROVIDER=moyasar`;
every entry point raises `BillingNotConfigured` until the provider is built and
`MOYASAR_*` keys are set, so selecting it can never silently half-work.

Mirrors the four public entry points of `billing.services`.
"""

from .services import BillingNotConfigured

_NOT_IMPLEMENTED = (
    "Moyasar billing provider is not implemented yet — migration plan only "
    "(see docs/PDPL_PROCESSOR_EVALUATION.md). Set BILLING_PROVIDER=stripe."
)


def create_checkout_session(organization, plan_key: str, email: str) -> str:
    raise BillingNotConfigured(_NOT_IMPLEMENTED)


def create_portal_session(organization) -> str:
    raise BillingNotConfigured(_NOT_IMPLEMENTED)


def verify_webhook(payload: bytes, signature: str):
    raise BillingNotConfigured(_NOT_IMPLEMENTED)


def apply_subscription_event(event: dict) -> None:
    raise BillingNotConfigured(_NOT_IMPLEMENTED)
