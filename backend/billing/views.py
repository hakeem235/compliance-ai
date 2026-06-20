import stripe
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .plans import PLANS, reviews_limit_for
from .serializers import SubscriptionSerializer


class PublicPlansView(APIView):
    """Public plan catalog for the marketing/landing page (no auth)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"plans": list(PLANS.values())})


class BillingView(APIView):
    """Current org's subscription state + the plan catalog."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        sub = services.get_or_create_subscription(request.user.organization)
        return Response(
            {
                "subscription": SubscriptionSerializer(sub).data,
                "plans": list(PLANS.values()),
                "stripe_enabled": bool(settings.STRIPE_SECRET_KEY),
            }
        )


class UsageView(APIView):
    """AI-review usage for the current org this month vs. the plan allowance.
    Readable by any authenticated member (powers the sidebar credits meter)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone

        from documents.models import DocumentAnalysis

        org_id = request.user.organization_id
        sub = services.get_or_create_subscription(request.user.organization)
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        used = DocumentAnalysis.objects.filter(
            document__organization_id=org_id, created_at__gte=month_start
        ).count()
        return Response(
            {
                "reviews_used": used,
                "reviews_limit": reviews_limit_for(sub.plan),  # null = unlimited
                "plan": sub.plan,
            }
        )


class CheckoutView(APIView):
    """Start a Stripe Checkout for a plan; returns a redirect URL."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_key = request.data.get("plan", "")
        if plan_key not in PLANS or not PLANS[plan_key]["checkout"]:
            return Response({"detail": "Unknown or non-self-serve plan."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            url = services.create_checkout_session(request.user.organization, plan_key, request.user.email)
        except services.BillingNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except stripe.StripeError as exc:
            return Response({"detail": f"Stripe error: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"url": url})


class PortalView(APIView):
    """Open the Stripe billing portal to manage payment method / cancel."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            url = services.create_portal_session(request.user.organization)
        except services.BillingNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except stripe.StripeError as exc:
            return Response({"detail": f"Stripe error: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"url": url})


class WebhookView(APIView):
    """Stripe webhook receiver — verifies the signature and syncs subscription
    state. Called server-to-server by Stripe, so no user auth."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        signature = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        try:
            event = services.verify_webhook(request.body, signature)
        except services.BillingNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (ValueError, stripe.SignatureVerificationError):
            return Response({"detail": "Invalid webhook signature."}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event["type"]
        obj = event["data"]["object"]
        if event_type in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
            services.apply_subscription_event(obj)
        elif event_type == "checkout.session.completed" and obj.get("subscription"):
            stripe.api_key = settings.STRIPE_SECRET_KEY
            services.apply_subscription_event(stripe.Subscription.retrieve(obj["subscription"]))

        return Response({"received": True})
