"""Plan catalog — the source of truth for billing plans, mirrored by the
frontend's lib/plans. Enterprise is sales-led (no self-serve checkout)."""

from django.conf import settings

# reviews_per_month: None = unlimited. Mirrors the feature copy on the plan
# cards (Starter 50/mo, Growth 500/mo, Enterprise unlimited).
PLANS = {
    "starter": {"key": "starter", "name": "Starter", "price_sar": 249, "checkout": True, "reviews_per_month": 50},
    "growth": {"key": "growth", "name": "Growth", "price_sar": 749, "checkout": True, "reviews_per_month": 500},
    "enterprise": {"key": "enterprise", "name": "Enterprise", "price_sar": None, "checkout": False, "reviews_per_month": None},
}

# Allowance for an org with no active paid plan (free tier).
FREE_REVIEWS_PER_MONTH = 10


def reviews_limit_for(plan_key: str):
    """Monthly review allowance for a plan key. None = unlimited."""
    if plan_key in PLANS:
        return PLANS[plan_key]["reviews_per_month"]
    return FREE_REVIEWS_PER_MONTH


def price_id_for(plan_key: str) -> str:
    return settings.STRIPE_PRICE_IDS.get(plan_key, "")


def plan_for_price_id(price_id: str) -> str:
    for key, pid in settings.STRIPE_PRICE_IDS.items():
        if pid and pid == price_id:
            return key
    return ""
