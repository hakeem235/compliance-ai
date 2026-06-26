from django.urls import path

from .views import (
    CancelSubscriptionView,
    ChangePlanView,
    ClientDetailView,
    ClientListView,
    ClientPaymentsView,
    PlatformStatsView,
    ReactivateSubscriptionView,
    RefundView,
)

urlpatterns = [
    path("backoffice/stats/", PlatformStatsView.as_view(), name="backoffice-stats"),
    path("backoffice/clients/", ClientListView.as_view(), name="backoffice-clients"),
    path("backoffice/clients/<uuid:org_id>/", ClientDetailView.as_view(), name="backoffice-client-detail"),
    path("backoffice/clients/<uuid:org_id>/payments/", ClientPaymentsView.as_view(), name="backoffice-client-payments"),
    path("backoffice/clients/<uuid:org_id>/change-plan/", ChangePlanView.as_view(), name="backoffice-change-plan"),
    path("backoffice/clients/<uuid:org_id>/cancel/", CancelSubscriptionView.as_view(), name="backoffice-cancel"),
    path("backoffice/clients/<uuid:org_id>/reactivate/", ReactivateSubscriptionView.as_view(), name="backoffice-reactivate"),
    path("backoffice/clients/<uuid:org_id>/refund/", RefundView.as_view(), name="backoffice-refund"),
]
