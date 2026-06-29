import uuid

from django.db import models

from documents.models import Document
from organizations.models import Organization

from .crypto import decrypt_secret, encrypt_secret


class ComplianceEvent(models.Model):
    TYPE_CHOICES = [
        ("license_renewal", "License Renewal"),
        ("contract_expiry", "Contract Expiry"),
        ("tax_deadline", "Tax Deadline"),
        ("hr_obligation", "HR Obligation"),
    ]
    STATUS_CHOICES = [
        ("upcoming", "Upcoming"),
        ("due", "Due"),
        ("overdue", "Overdue"),
        ("resolved", "Resolved"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="compliance_events")
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    category = models.CharField(
        max_length=100,
        blank=True,
        help_text="Free-text obligation category for deadlines that don't fit the fixed type choices, "
        "e.g. 'CMA Disclosure', 'ESG Reporting', 'Internal Audit'.",
    )
    related_document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="upcoming")
    notify_emails = models.JSONField(default=list, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_type_display()} due {self.due_date}"


class OrgEmailConfig(models.Model):
    """Per-organization SMTP settings so each client sends reminders from their
    own mail server. The password is encrypted at rest (never returned by the
    API)."""

    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name="email_config")
    host = models.CharField(max_length=255)
    port = models.PositiveIntegerField(default=587)
    username = models.CharField(max_length=255, blank=True)
    password_encrypted = models.TextField(blank=True, default="")
    from_email = models.EmailField()
    use_tls = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def for_org(cls, organization_id) -> "OrgEmailConfig | None":
        """The org's SMTP config, or None. Centralizes the tenant-scoped lookup
        used by the views and the reminder command."""
        return cls.objects.filter(organization_id=organization_id).first()

    def set_password(self, raw: str) -> None:
        self.password_encrypted = encrypt_secret(raw) if raw else ""

    def get_password(self) -> str:
        return decrypt_secret(self.password_encrypted)

    @property
    def has_password(self) -> bool:
        return bool(self.password_encrypted)

    def __str__(self):
        return f"Email config for {self.organization.name}"
