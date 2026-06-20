from rest_framework import serializers

from .models import ComplianceEvent, OrgEmailConfig


class ComplianceEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceEvent
        fields = ["id", "type", "category", "related_document", "due_date", "status", "notify_emails", "created_at"]
        read_only_fields = ["id", "created_at"]


class OrgEmailConfigSerializer(serializers.ModelSerializer):
    # Write-only: a new password is accepted on save but never returned.
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_password = serializers.BooleanField(read_only=True)

    class Meta:
        model = OrgEmailConfig
        fields = ["host", "port", "username", "from_email", "use_tls", "password", "has_password", "updated_at"]
        read_only_fields = ["updated_at"]

    def save(self, **kwargs):
        password = self.validated_data.pop("password", None)
        instance = super().save(**kwargs)
        # Only overwrite the stored password when a non-blank one is supplied,
        # so editing other fields doesn't wipe an existing password.
        if password:
            instance.set_password(password)
            instance.save(update_fields=["password_encrypted"])
        return instance
