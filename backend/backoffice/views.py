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
        "comped": bool(sub and sub.comped),
        "is_suspended": org.is_suspended,
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
                "suspended_clients": Organization.objects.filter(is_suspended=True).count(),
                "comped_clients": sum(1 for s in subs if s.comped),
            }
        )


def _filtered_orgs(request):
    """Shared org filtering for the list + CSV export (q / plan / status)."""
    q = (request.query_params.get("q") or "").strip()
    plan = (request.query_params.get("plan") or "").strip()
    sub_status = (request.query_params.get("status") or "").strip()
    orgs = Organization.objects.all().order_by("-created_at")
    if q:
        orgs = orgs.filter(name__icontains=q)
    if plan:
        # plan="free" means no paid subscription plan.
        orgs = orgs.filter(subscription__plan="") if plan == "free" else orgs.filter(subscription__plan=plan)
    if sub_status:
        if sub_status == "suspended":
            orgs = orgs.filter(is_suspended=True)
        elif sub_status == "none":
            orgs = orgs.filter(subscription__isnull=True) | orgs.filter(subscription__status="none")
        else:
            orgs = orgs.filter(subscription__status=sub_status)
    return orgs.distinct()


class ClientListView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        orgs_qs = _filtered_orgs(request)
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(100, max(1, int(request.query_params.get("page_size", 25))))
        except ValueError:
            page, page_size = 1, 25
        total = orgs_qs.count()
        start = (page - 1) * page_size
        orgs = list(orgs_qs[start : start + page_size])
        sub_by_org = {s.organization_id: s for s in Subscription.objects.all()}
        member_counts = {
            row["organization_id"]: row["n"]
            for row in OrgUser.objects.values("organization_id").annotate(n=Count("id"))
        }
        return Response(
            {
                "results": [_client_summary(o, sub_by_org, member_counts) for o in orgs],
                "page": page,
                "page_size": page_size,
                "total": total,
                "has_next": start + page_size < total,
            }
        )


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
                "is_suspended": org.is_suspended,
                "suspended_at": org.suspended_at.isoformat() if org.suspended_at else None,
                "internal_notes": org.internal_notes,
                "members": members,
                "subscription": {
                    "plan": sub.plan if sub else "",
                    "plan_name": PLANS.get(sub.plan, {}).get("name", "Free") if sub else "Free",
                    "status": sub.status if sub else "none",
                    "comped": bool(sub and sub.comped),
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


# --- Client lifecycle: suspend / restore / notes -----------------------------


class SuspendClientView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, org_id):
        from django.utils import timezone

        org = _get_org_or_404(org_id)
        if not org:
            return Response({"detail": "Client not found."}, status=404)
        suspend = bool(request.data.get("suspend", True))
        org.is_suspended = suspend
        org.suspended_at = timezone.now() if suspend else None
        org.save(update_fields=["is_suspended", "suspended_at"])
        _audit(request.user, org, "platform.suspend" if suspend else "platform.restore", "organization", org.id)
        return Response({"is_suspended": org.is_suspended})


class ClientNotesView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def put(self, request, org_id):
        org = _get_org_or_404(org_id)
        if not org:
            return Response({"detail": "Client not found."}, status=404)
        org.internal_notes = (request.data.get("notes") or "").strip()
        org.save(update_fields=["internal_notes"])
        _audit(request.user, org, "platform.update_notes", "organization", org.id)
        return Response({"internal_notes": org.internal_notes})


# --- Member management -------------------------------------------------------


class MemberDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def _member(self, org_id, member_id):
        return OrgUser.objects.filter(id=member_id, organization_id=org_id).select_related("organization").first()

    def patch(self, request, org_id, member_id):
        member = self._member(org_id, member_id)
        if not member:
            return Response({"detail": "Member not found."}, status=404)
        role = (request.data.get("role") or "").strip()
        valid_roles = {c[0] for c in OrgUser.ROLE_CHOICES}
        if role not in valid_roles:
            return Response({"detail": f"Invalid role. One of: {sorted(valid_roles)}"}, status=400)
        member.role = role
        member.save(update_fields=["role"])
        _audit(request.user, member.organization, "platform.change_member_role", "org_user", member.id, {"role": role})
        return Response({"id": str(member.id), "role": member.role})

    def delete(self, request, org_id, member_id):
        member = self._member(org_id, member_id)
        if not member:
            return Response({"detail": "Member not found."}, status=404)
        # Don't strand an org with zero members.
        if OrgUser.objects.filter(organization_id=org_id).count() <= 1:
            return Response({"detail": "Cannot remove the only member of a client."}, status=400)
        org = member.organization
        member_email = member.email
        member.delete()
        _audit(request.user, org, "platform.remove_member", "org_user", member_id, {"email": member_email})
        return Response(status=204)


# --- Billing extra: comp a plan (no Stripe) ----------------------------------


class CompPlanView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, org_id):
        org = _get_org_or_404(org_id)
        if not org:
            return Response({"detail": "Client not found."}, status=404)
        plan = (request.data.get("plan") or "").strip()
        try:
            result = services.comp_plan(org, plan)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        _audit(request.user, org, "platform.comp_plan", "subscription", org.id, {"plan": plan})
        return Response(result)


# --- Visibility: per-client audit, platform-wide audit ------------------------


def _serialize_logs(qs, limit=50):
    return [
        {
            "id": str(log.id),
            "organization": str(log.organization_id),
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "actor_name": (log.actor.email if log.actor else ""),
            "metadata": log.metadata,
            "created_at": log.created_at.isoformat(),
        }
        for log in qs[:limit]
    ]


class ClientAuditView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request, org_id):
        org = _get_org_or_404(org_id)
        if not org:
            return Response({"detail": "Client not found."}, status=404)
        return Response(_serialize_logs(AuditLog.objects.filter(organization=org)))


class PlatformAuditView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        # Platform-staff actions across all orgs (tagged in _audit metadata).
        qs = AuditLog.objects.filter(metadata__platform_action=True)
        return Response(_serialize_logs(qs, limit=100))


# --- Manage platform staff ---------------------------------------------------


class PlatformAdminsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        from .models import PlatformAdmin

        return Response(
            [
                {"id": str(a.id), "clerk_user_id": a.clerk_user_id, "email": a.email, "note": a.note, "created_at": a.created_at.isoformat()}
                for a in PlatformAdmin.objects.all().order_by("created_at")
            ]
        )

    def post(self, request):
        from .models import PlatformAdmin

        clerk_id = (request.data.get("clerk_user_id") or "").strip()
        if not clerk_id:
            return Response({"detail": "clerk_user_id is required."}, status=400)
        admin, _ = PlatformAdmin.objects.update_or_create(
            clerk_user_id=clerk_id,
            defaults={"email": (request.data.get("email") or "").strip(), "note": (request.data.get("note") or "").strip()},
        )
        return Response(
            {"id": str(admin.id), "clerk_user_id": admin.clerk_user_id, "email": admin.email, "note": admin.note},
            status=201,
        )


class PlatformAdminDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def delete(self, request, admin_id):
        from .models import PlatformAdmin

        admin = PlatformAdmin.objects.filter(id=admin_id).first()
        if not admin:
            return Response({"detail": "Not found."}, status=404)
        # Never remove the last platform admin — that would lock everyone out.
        if PlatformAdmin.objects.count() <= 1:
            return Response({"detail": "Cannot remove the last platform admin."}, status=400)
        admin.delete()
        return Response(status=204)


# --- CSV export --------------------------------------------------------------


class ClientExportView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        import csv
        import io

        from django.http import HttpResponse

        orgs = list(_filtered_orgs(request)[:5000])
        sub_by_org = {s.organization_id: s for s in Subscription.objects.all()}
        member_counts = {
            row["organization_id"]: row["n"]
            for row in OrgUser.objects.values("organization_id").annotate(n=Count("id"))
        }
        def _csv_safe(value):
            # Defuse spreadsheet formula injection: a cell beginning with a
            # formula trigger (e.g. an org name like "=HYPERLINK(...)") is
            # prefixed with a single quote so Excel/Sheets treat it as text.
            text = "" if value is None else str(value)
            if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
                text = "'" + text
            return text

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["id", "name", "jurisdiction", "plan", "status", "comped", "suspended", "members", "created_at"])
        for o in orgs:
            s = _client_summary(o, sub_by_org, member_counts)
            writer.writerow([
                _csv_safe(v) for v in (
                    s["id"], s["name"], s["jurisdiction"], s["plan"] or "free", s["subscription_status"],
                    s["comped"], s["is_suspended"], s["members"], s["created_at"],
                )
            ])
        resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = "attachment; filename=clients.csv"
        return resp
