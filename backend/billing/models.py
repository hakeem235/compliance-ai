from django.db import models

from organizations.models import Organization


class Subscription(models.Model):
    STATUS_CHOICES = [
        ("none", "None"),
        ("active", "Active"),
        ("past_due", "Past due"),
        ("canceled", "Canceled"),
    ]

    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name="subscription")
    plan = models.CharField(max_length=30, blank=True, default="")  # "" = no paid plan
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="none")
    stripe_customer_id = models.CharField(max_length=255, blank=True, default="")
    stripe_subscription_id = models.CharField(max_length=255, blank=True, default="")
    current_period_end = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.organization.name}: {self.plan or 'free'} ({self.status})"
