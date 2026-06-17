"""
Writes an AuditLog row for every state-changing request made by an
authenticated org member. Read-only requests (GET/HEAD/OPTIONS) are not
logged here — log those explicitly in the view if the access itself is
sensitive (e.g. opening a document).
"""

from .models import AuditLog

STATE_CHANGING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        org_user = getattr(request, "user", None)
        if (
            request.method in STATE_CHANGING_METHODS
            and 200 <= response.status_code < 300
            and getattr(org_user, "organization_id", None)
        ):
            AuditLog.objects.create(
                organization_id=org_user.organization_id,
                actor=org_user,
                action=f"{request.method} {request.path}",
                resource_type=request.resolver_match.url_name if request.resolver_match else "",
                resource_id="",
                metadata={"status_code": response.status_code},
            )

        return response
