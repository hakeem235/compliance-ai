"""Grant a user platform back-office access by Clerk user id (out-of-band, never
self-served through the API)."""

from django.core.management.base import BaseCommand, CommandError

from backoffice.models import PlatformAdmin


class Command(BaseCommand):
    help = "Add a platform administrator (cross-tenant back-office access)."

    def add_arguments(self, parser):
        parser.add_argument("--clerk-id", required=True, help="Clerk user id (sub claim) to grant access.")
        parser.add_argument("--email", default="", help="Email for display/audit.")
        parser.add_argument("--note", default="", help="Optional note (who/why).")

    def handle(self, *args, **options):
        clerk_id = options["clerk_id"].strip()
        if not clerk_id:
            raise CommandError("--clerk-id is required.")
        obj, created = PlatformAdmin.objects.update_or_create(
            clerk_user_id=clerk_id,
            defaults={"email": options["email"].strip(), "note": options["note"].strip()},
        )
        verb = "Granted" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{verb} platform admin: {obj}"))
