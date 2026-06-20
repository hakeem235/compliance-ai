from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import MeView, OrganizationViewSet, OrgUserViewSet

router = DefaultRouter()
router.register("organizations", OrganizationViewSet, basename="organization")
router.register("members", OrgUserViewSet, basename="org-user")

urlpatterns = router.urls + [
    path("me/", MeView.as_view(), name="me"),
]
