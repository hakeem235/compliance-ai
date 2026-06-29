import stripe
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .plans import PLANS
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
                "provider": services.provider_name(),
                "billing_enabled": services.billing_enabled(),
                "portal_supported": services.portal_supported(),
            }
        )


class UsageView(APIView):
    """AI-review usage for the current org this month vs. the plan allowance.
    Readable by any authenticated member (powers the sidebar credits meter)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .usage import review_usage

        usage = review_usage(request.user.organization)
        return Response(
            {
                "reviews_used": usage["used"],
                "reviews_limit": usage["limit"],  # null = unlimited
                "plan": usage["plan"],
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
        except (services.BillingError, stripe.StripeError) as exc:
            return Response({"detail": f"Payment error: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"url": url})


class PortalView(APIView):
    """Open the Stripe billing portal to manage payment method / cancel."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            url = services.create_portal_session(request.user.organization)
        except services.BillingNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (services.BillingError, stripe.StripeError) as exc:
            return Response({"detail": f"Payment error: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"url": url})


class WebhookView(APIView):
    """Payment webhook receiver — verifies and syncs subscription state. Called
    server-to-server by the provider (Moyasar/Stripe), so no user auth. Moyasar
    authenticates via a `secret_token` in the body; Stripe via a header."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        signature = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        try:
            services.process_webhook(request.body, signature)
        except services.BillingNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError:
            return Response({"detail": "Invalid webhook."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"received": True})
