from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ComplianceEventViewSet, EmailConfigTestView, EmailConfigView

router = DefaultRouter()
router.register("compliance-events", ComplianceEventViewSet, basename="compliance-event")

urlpatterns = router.urls + [
    path("email-config/", EmailConfigView.as_view(), name="email-config"),
    path("email-config/test/", EmailConfigTestView.as_view(), name="email-config-test"),
]
