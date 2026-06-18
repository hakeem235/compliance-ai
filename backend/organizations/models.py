import uuid

from django.db import models


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    jurisdiction = models.CharField(max_length=10, default="SA")
    plan = models.CharField(max_length=50, default="free")
    created_at = models.DateTimeField(auto_now_add=True)

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
    clerk_user_id = models.CharField(max_length=255, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="members")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")
    email = models.EmailField()
    name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.email} ({self.organization.name})"

    @property
    def is_authenticated(self):
        return True
