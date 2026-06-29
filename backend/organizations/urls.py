from django.urls import path
from rest_framework.routers import DefaultRouter

from .auth_views import LoginView, RegisterView
from .views import MeView, OrganizationViewSet, OrgUserViewSet

router = DefaultRouter()
router.register("organizations", OrganizationViewSet, basename="organization")
router.register("members", OrgUserViewSet, basename="org-user")

urlpatterns = router.urls + [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("me/", MeView.as_view(), name="me"),
]
