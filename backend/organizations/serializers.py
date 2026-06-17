from rest_framework import serializers

from .models import Organization, OrgUser


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "jurisdiction", "plan", "created_at"]


class OrgUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrgUser
        fields = ["id", "organization", "role", "email", "name", "created_at"]
        read_only_fields = ["id", "created_at"]
