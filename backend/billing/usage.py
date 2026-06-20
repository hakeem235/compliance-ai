"""AI-review usage accounting — shared by the usage endpoint (sidebar meter)
and the analyze-endpoint quota gate so they always agree."""

from django.utils import timezone

from .models import Subscription
from .plans import reviews_limit_for


def _month_start():
    return timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def review_usage(organization) -> dict:
    """Reviews used this calendar month vs. the org's plan allowance.

    Returns {"used", "limit", "plan"}. limit is None for unlimited plans.
    """
    # Imported here to avoid a billing→documents import cycle at module load.
    from documents.models import DocumentAnalysis

    sub, _ = Subscription.objects.get_or_create(organization=organization)
    used = DocumentAnalysis.objects.filter(
        document__organization_id=organization.id, created_at__gte=_month_start()
    ).count()
    return {"used": used, "limit": reviews_limit_for(sub.plan), "plan": sub.plan}


def review_limit_reached(organization) -> bool:
    """True when the org has hit/exceeded its monthly review allowance."""
    usage = review_usage(organization)
    return usage["limit"] is not None and usage["used"] >= usage["limit"]
