"""
Dev convenience: stand up everything needed to sign in and reach the platform
back-office in one step — an Organization, an OrgUser bound to your Clerk user
id, and a PlatformAdmin grant.

Local/dev only. There is no Clerk webhook that auto-provisions OrgUsers, so a
freshly signed-in Clerk user otherwise 401s until a matching OrgUser exists;
this command removes that friction for testing.
"""

from django.core.management.base import BaseCommand, CommandError

from backoffice.models import PlatformAdmin
from organizations.models import Organization, OrgUser


class Command(BaseCommand):
    help = "Seed an Organization + OrgUser + PlatformAdmin for a Clerk user id (dev only)."

    def add_arguments(self, parser):
        parser.add_argument("--clerk-id", required=True, help="Your Clerk user id (sub claim, e.g. user_2abc...).")
        parser.add_argument("--email", default="dev@example.com", help="Email for the OrgUser / platform admin.")
        parser.add_argument("--org-name", default="Dev Org", help="Organization name to create or reuse.")
        parser.add_argument("--name", default="Dev Admin", help="Display name for the OrgUser.")

    def handle(self, *args, **options):
        clerk_id = options["clerk_id"].strip()
        if not clerk_id:
            raise CommandError("--clerk-id is required.")
        email = options["email"].strip()

        # Reuse an existing OrgUser for this Clerk id if one already exists, so
        # re-running is idempotent and doesn't trip the unique clerk_user_id.
        org_user = OrgUser.objects.filter(clerk_user_id=clerk_id).select_related("organization").first()
        if org_user:
            org = org_user.organization
            self.stdout.write(f"Reusing existing OrgUser in org '{org.name}'.")
        else:
            org, created = Organization.objects.get_or_create(name=options["org_name"])
            self.stdout.write(("Created" if created else "Reusing") + f" organization '{org.name}'.")
            org_user = OrgUser.objects.create(
                organization=org,
                clerk_user_id=clerk_id,
                email=email,
                name=options["name"].strip(),
                role="owner",
            )
            self.stdout.write(f"Created OrgUser {org_user.email} ({clerk_id}).")

        _, created = PlatformAdmin.objects.update_or_create(
            clerk_user_id=clerk_id,
            defaults={"email": email or org_user.email, "note": "seed_dev_admin"},
        )
        self.stdout.write(("Granted" if created else "Refreshed") + " platform admin access.")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Sign in as {clerk_id} and open /en/platform — the Clients & Payments section will appear."
            )
        )
