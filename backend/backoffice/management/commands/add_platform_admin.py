"""Grant a user platform back-office access by email (out-of-band, never
self-served through the API)."""

from django.core.management.base import BaseCommand, CommandError

from backoffice.models import PlatformAdmin
from organizations.models import OrgUser


class Command(BaseCommand):
    help = "Add a platform administrator (cross-tenant back-office access)."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Email of an existing OrgUser to grant access.")
        parser.add_argument("--note", default="", help="Optional note (who/why).")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        if not email:
            raise CommandError("--email is required.")
        user = OrgUser.objects.filter(email=email).first()
        if user is None:
            raise CommandError(f"No OrgUser with email '{email}'. Create the account first.")
        obj, created = PlatformAdmin.objects.update_or_create(
            org_user=user,
            defaults={"email": email, "note": options["note"].strip()},
        )
        verb = "Granted" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{verb} platform admin: {obj}"))
