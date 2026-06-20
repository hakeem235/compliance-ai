from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/", include("organizations.urls")),
    path("api/", include("documents.urls")),
    path("api/", include("compliance.urls")),
    path("api/", include("assistant.urls")),
    path("api/", include("billing.urls")),
    path("api/", include("audit.urls")),
]
