from django.contrib import admin

from .models import PlatformAdmin


@admin.register(PlatformAdmin)
class PlatformAdminAdmin(admin.ModelAdmin):
    list_display = ("email", "clerk_user_id", "note", "created_at")
    search_fields = ("email", "clerk_user_id", "note")
