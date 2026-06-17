from rest_framework.routers import DefaultRouter

from .views import OrganizationViewSet, OrgUserViewSet

router = DefaultRouter()
router.register("organizations", OrganizationViewSet, basename="organization")
router.register("members", OrgUserViewSet, basename="org-user")

urlpatterns = router.urls
