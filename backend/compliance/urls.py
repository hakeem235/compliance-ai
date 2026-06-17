from rest_framework.routers import DefaultRouter

from .views import ComplianceEventViewSet

router = DefaultRouter()
router.register("compliance-events", ComplianceEventViewSet, basename="compliance-event")

urlpatterns = router.urls
