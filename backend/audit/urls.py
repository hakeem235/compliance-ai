from django.urls import path

from .views import AdminStatsView, AuditLogView

urlpatterns = [
    path("audit-logs/", AuditLogView.as_view(), name="audit-logs"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
]
