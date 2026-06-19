from rest_framework import serializers

from .models import ComplianceEvent


class ComplianceEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceEvent
        fields = ["id", "type", "category", "related_document", "due_date", "status", "notify_emails", "created_at"]
        read_only_fields = ["id", "created_at"]
