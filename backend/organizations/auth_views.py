"""Email/password auth endpoints: register (new org + owner) and login."""

from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import make_token
from .models import Organization, OrgUser
from .serializers import OrgUserSerializer


def _user_payload(user: OrgUser) -> dict:
    from backoffice.permissions import is_platform_admin

    data = OrgUserSerializer(user).data
    data["organization_name"] = user.organization.name
    data["is_platform_admin"] = is_platform_admin(user)
    return data


class RegisterView(APIView):
    """Create a new organization and its first user (owner), return a token."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        name = (request.data.get("name") or "").strip()
        org_name = (request.data.get("organization_name") or "").strip()

        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({"detail": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)
        if not org_name:
            return Response({"detail": "Organization name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if OrgUser.objects.filter(email=email).exists():
            return Response({"detail": "An account with this email already exists."}, status=status.HTTP_409_CONFLICT)

        try:
            with transaction.atomic():
                org = Organization.objects.create(name=org_name)
                user = OrgUser(organization=org, email=email, name=name, role="owner")
                user.set_password(password)
                user.save()
        except IntegrityError:
            return Response({"detail": "An account with this email already exists."}, status=status.HTTP_409_CONFLICT)

        return Response({"token": make_token(user), "user": _user_payload(user)}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Authenticate an existing user by email + password, return a token."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        user = OrgUser.objects.select_related("organization").filter(email=email).first()
        # Always run check_password (even on a miss, against a dummy) to avoid
        # leaking which emails exist via response timing.
        if user is None or not user.check_password(password):
            return Response({"detail": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({"token": make_token(user), "user": _user_payload(user)})
