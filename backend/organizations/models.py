import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    jurisdiction = models.CharField(max_length=10, default="SA")
    plan = models.CharField(max_length=50, default="free")
    created_at = models.DateTimeField(auto_now_add=True)
    # Platform back-office controls. A suspended org's members are blocked at
    # authentication (see JWTAuthentication); platform staff are unaffected
    # since their own org is not suspended. internal_notes are staff-only.
    is_suspended = models.BooleanField(default=False)
    suspended_at = models.DateTimeField(null=True, blank=True)
    internal_notes = models.TextField(blank=True, default="")

    def __str__(self):
        return self.name


class OrgUser(models.Model):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("owner", "Business Owner"),
        ("member", "Team Member"),
        ("legal_reviewer", "Legal Reviewer"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="members")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")
    # Email is the login identifier — unique across the platform.
    email = models.EmailField(unique=True)
    # Django-hashed password (PBKDF2 by default). Never stored in plaintext.
    password = models.CharField(max_length=255, blank=True, default="")
    name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.email} ({self.organization.name})"

    def set_password(self, raw_password: str) -> None:
        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return bool(self.password) and check_password(raw_password, self.password)

    # DRF treats the authenticated user as truthy + authenticated.
    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False
