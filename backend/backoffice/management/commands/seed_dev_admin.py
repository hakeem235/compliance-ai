"""
Dev convenience: stand up everything needed to log in and reach the platform
back-office in one step — an Organization, an OrgUser (owner) with a password,
and a PlatformAdmin grant.

Local/dev only.
"""

from django.core.management.base import BaseCommand

from backoffice.models import PlatformAdmin
from organizations.models import Organization, OrgUser


class Command(BaseCommand):
    help = "Seed an Organization + OrgUser (owner) + PlatformAdmin with a password (dev only)."

    def add_arguments(self, parser):
        parser.add_argument("--email", default="dev@example.com", help="Login email for the OrgUser / platform admin.")
        parser.add_argument("--password", default="password123", help="Login password (min 8 chars).")
        parser.add_argument("--org-name", default="Dev Org", help="Organization name to create or reuse.")
        parser.add_argument("--name", default="Dev Admin", help="Display name for the OrgUser.")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        password = options["password"]

        org_user = OrgUser.objects.filter(email=email).select_related("organization").first()
        if org_user:
            org = org_user.organization
            self.stdout.write(f"Reusing existing OrgUser in org '{org.name}'.")
        else:
            org, created = Organization.objects.get_or_create(name=options["org_name"])
            self.stdout.write(("Created" if created else "Reusing") + f" organization '{org.name}'.")
            org_user = OrgUser(organization=org, email=email, name=options["name"].strip(), role="owner")
            org_user.set_password(password)
            org_user.save()
            self.stdout.write(f"Created OrgUser {org_user.email}.")

        _, created = PlatformAdmin.objects.update_or_create(
            org_user=org_user,
            defaults={"email": email, "note": "seed_dev_admin"},
        )
        self.stdout.write(("Granted" if created else "Refreshed") + " platform admin access.")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Log in as {email} / {password} and open /en/platform — the Clients & Payments section will appear."
            )
        )
