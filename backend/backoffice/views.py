"""
Platform back-office API (cross-tenant). Every endpoint is gated by
IsPlatformAdmin — these views intentionally read and mutate across ALL
organizations, so the permission is the security boundary. Every mutation is
written to the affected client's audit log.
"""

from django.db.models import Count
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditLog
from billing.models import Subscription
from billing.plans import PLANS
from billing.services import BillingNotConfigured
from billing.usage import review_usage
from documents.models import Document
from organizations.models import Organization, OrgUser

from . import services
from .permissions import IsPlatformAdmin


def _audit(actor, organization, action, resource_type, resource_id="", metadata=None):
    """Record a platform action against the affected client's audit trail."""
    meta = {"platform_action": True, "actor_email": getattr(actor, "email", "")}
    meta.update(metadata or {})
    AuditLog.objects.create(
        organization=organization,
        actor=actor,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        metadata=meta,
    )


def _plan_price(plan_key: str):
    return PLANS.get(plan_key, {}).get("price_sar")


def _client_summary(org, sub_by_org, member_counts) -> dict:
    sub = sub_by_org.get(org.id)
    plan = sub.plan if sub else ""
    sub_status = sub.status if sub else "none"
    return {
        "id": str(org.id),
        "name": org.name,
        "jurisdiction": org.jurisdiction,
        "created_at": org.created_at.isoformat(),
        "members": member_counts.get(org.id, 0),
        "plan": plan,
        "plan_name": PLANS.get(plan, {}).get("name", "Free" if not plan else plan),
        "subscription_status": sub_status,
        "current_period_end": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
    }


class PlatformStatsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        subs = list(Subscription.objects.all())
        active = [s for s in subs if s.status == "active" and s.plan]
        mrr = sum((_plan_price(s.plan) or 0) for s in active)
        return Response(
            {
                "total_clients": Organization.objects.count(),
                "total_users": OrgUser.objects.count(),
                "active_subscriptions": len(active),
                "past_due": sum(1 for s in subs if s.status == "past_due"),
                "mrr_sar": mrr,
                "docs_analyzed": Document.objects.filter(status="analyzed").count(),
            }
        )


class ClientListView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        orgs = Organization.objects.all().order_by("-created_at")
        if q:
            orgs = orgs.filter(name__icontains=q)
        orgs = list(orgs[:200])
        sub_by_org = {s.organization_id: s for s in Subscription.objects.all()}
        member_counts = {
            row["organization_id"]: row["n"]
            for row in OrgUser.objects.values("organization_id").annotate(n=Count("id"))
        }
        return Response([_client_summary(o, sub_by_org, member_counts) for o in orgs])


class ClientDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request, org_id):
        org = Organization.objects.filter(id=org_id).first()
        if not org:
            return Response({"detail": "Client not found."}, status=404)
        sub = Subscription.objects.filter(organization=org).first()
        members = [
            {"id": str(m.id), "email": m.email, "name": m.name, "role": m.role, "created_at": m.created_at.isoformat()}
            for m in OrgUser.objects.filter(organization=org).order_by("created_at")
        ]
        usage = review_usage(org)
        return Response(
            {
                "id": str(org.id),
                "name": org.name,
                "jurisdiction": org.jurisdiction,
                "created_at": org.created_at.isoformat(),
                "members": members,
                "subscription": {
                    "plan": sub.plan if sub else "",
                    "plan_name": PLANS.get(sub.plan, {}).get("name", "Free") if sub else "Free",
                    "status": sub.status if sub else "none",
                    "current_period_end": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
                    "stripe_customer_id": sub.stripe_customer_id if sub else "",
                    "has_stripe_subscription": bool(sub and sub.stripe_subscription_id),
                },
                "usage": usage,
                "docs_analyzed": Document.objects.filter(organization=org, status="analyzed").count(),
            }
        )


def _get_org_or_404(org_id):
    return Organization.objects.filter(id=org_id).first()


class ClientPaymentsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request, org_id):
        org = _get_org_or_404(org_id)
        if not org:
            return Response({"detail": "Client not found."}, status=404)
        try:
            payments = services.list_payments(org)
        except BillingNotConfigured as exc:
            return Response({"detail": str(exc), "code": "billing_not_configured"}, status=503)
        return Response(payments)


class ChangePlanView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, org_id):
        org = _get_org_or_404(org_id)
        if not org:
            return Response({"detail": "Client not found."}, status=404)
        plan = (request.data.get("plan") or "").strip()
        try:
            result = services.change_plan(org, plan)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        except BillingNotConfigured as exc:
            return Response({"detail": str(exc), "code": "billing_not_configured"}, status=503)
        _audit(request.user, org, "platform.change_plan", "subscription", org.id, {"plan": plan})
        return Response(result, status=status.HTTP_200_OK)


class CancelSubscriptionView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, org_id):
        org = _get_org_or_404(org_id)
        if not org:
            return Response({"detail": "Client not found."}, status=404)
        at_period_end = bool(request.data.get("at_period_end", True))
        try:
            result = services.cancel_subscription(org, at_period_end=at_period_end)
        except BillingNotConfigured as exc:
            return Response({"detail": str(exc), "code": "billing_not_configured"}, status=503)
        _audit(request.user, org, "platform.cancel_subscription", "subscription", org.id, {"at_period_end": at_period_end})
        return Response(result)


class ReactivateSubscriptionView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, org_id):
        org = _get_org_or_404(org_id)
        if not org:
            return Response({"detail": "Client not found."}, status=404)
        try:
            result = services.reactivate_subscription(org)
        except BillingNotConfigured as exc:
            return Response({"detail": str(exc), "code": "billing_not_configured"}, status=503)
        _audit(request.user, org, "platform.reactivate_subscription", "subscription", org.id)
        return Response(result)


class RefundView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, org_id):
        org = _get_org_or_404(org_id)
        if not org:
            return Response({"detail": "Client not found."}, status=404)
        payment_intent = (request.data.get("payment_intent") or "").strip()
        amount = request.data.get("amount")
        try:
            result = services.refund_payment(payment_intent, amount=amount)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        except BillingNotConfigured as exc:
            return Response({"detail": str(exc), "code": "billing_not_configured"}, status=503)
        _audit(
            request.user, org, "platform.refund", "payment", payment_intent,
            {"amount": amount, "refund_id": result.get("id")},
        )
        return Response(result)
