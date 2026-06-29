from django.urls import path

from .views import (
    BillingView,
    CheckoutView,
    ConfirmView,
    PortalView,
    PublicPlansView,
    UsageView,
    WebhookView,
)

urlpatterns = [
    path("plans/", PublicPlansView.as_view(), name="public-plans"),
    path("usage/", UsageView.as_view(), name="usage"),
    path("billing/", BillingView.as_view(), name="billing"),
    path("billing/checkout/", CheckoutView.as_view(), name="billing-checkout"),
    path("billing/confirm/", ConfirmView.as_view(), name="billing-confirm"),
    path("billing/portal/", PortalView.as_view(), name="billing-portal"),
    path("billing/webhook/", WebhookView.as_view(), name="billing-webhook"),
]
