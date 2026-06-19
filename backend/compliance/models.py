import uuid

from django.db import models

from documents.models import Document
from organizations.models import Organization


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
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_type_display()} due {self.due_date}"
