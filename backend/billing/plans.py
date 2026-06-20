"""Plan catalog — the source of truth for billing plans, mirrored by the
frontend's lib/plans. Enterprise is sales-led (no self-serve checkout)."""

from django.conf import settings

PLANS = {
    "starter": {"key": "starter", "name": "Starter", "price_sar": 249, "checkout": True},
    "growth": {"key": "growth", "name": "Growth", "price_sar": 749, "checkout": True},
    "enterprise": {"key": "enterprise", "name": "Enterprise", "price_sar": None, "checkout": False},
}


def price_id_for(plan_key: str) -> str:
    return settings.STRIPE_PRICE_IDS.get(plan_key, "")


def plan_for_price_id(price_id: str) -> str:
    for key, pid in settings.STRIPE_PRICE_IDS.items():
        if pid and pid == price_id:
            return key
    return ""
