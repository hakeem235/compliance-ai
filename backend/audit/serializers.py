from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ["id", "action", "resource_type", "resource_id", "actor_name", "metadata", "created_at"]
        read_only_fields = fields

    def get_actor_name(self, obj) -> str:
        if not obj.actor:
            return ""
        return obj.actor.name or obj.actor.email
