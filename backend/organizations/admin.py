from django.contrib import admin

from .models import Organization, OrgUser

admin.site.register(Organization)
admin.site.register(OrgUser)
