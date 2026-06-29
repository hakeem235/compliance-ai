from django.contrib import admin

from .models import PlatformAdmin


@admin.register(PlatformAdmin)
class PlatformAdminAdmin(admin.ModelAdmin):
    list_display = ("email", "org_user", "note", "created_at")
    search_fields = ("email", "note")
