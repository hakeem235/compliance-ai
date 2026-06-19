"""
Seeds realistic Saudi regulatory deadlines as ComplianceEvent rows for an
organization, derived from Saudi_Arabia_Governance_Compliance.md (ZATCA VAT/
WHT/CIT-Zakat filing calendar + FATOORA wave notice). Run with:

    python manage.py seed_compliance_events --org "Najd Solutions"
"""

from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError

from compliance.models import ComplianceEvent
from organizations.models import Organization


def _add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def _next_month_on_day(today: date, day: int) -> date:
    candidate = _add_months(today, 1).replace(day=day)
    if today.day > day:
        candidate = _add_months(today, 2).replace(day=day)
    return candidate


def _fiscal_year_end_plus_120_days(today: date) -> date:
    fiscal_year_end = date(today.year, 12, 31)
    if today > fiscal_year_end:
        fiscal_year_end = date(today.year + 1, 12, 31)
    return fiscal_year_end + timedelta(days=120)


class Command(BaseCommand):
    help = "Seed realistic ZATCA/CMA compliance deadlines for an organization"

    def add_arguments(self, parser):
        parser.add_argument("--org", required=True, help="Organization name to seed events for")

    def handle(self, *args, **options):
        try:
            org = Organization.objects.get(name=options["org"])
        except Organization.DoesNotExist as exc:
            raise CommandError(f'Organization "{options["org"]}" does not exist') from exc

        today = date.today()
        events = [
            # VAT return — monthly filer assumed; ZATCA VAT Implementing Regulations
            {"type": "tax_deadline", "due_date": _next_month_on_day(today, 20)},
            # WHT remittance on payments to non-residents
            {"type": "tax_deadline", "due_date": _next_month_on_day(today, 10)},
            # Annual CIT/Zakat return — 120 days after fiscal year-end (assumed Dec 31)
            {"type": "tax_deadline", "due_date": _fiscal_year_end_plus_120_days(today)},
        ]

        created = 0
        for event in events:
            _, was_created = ComplianceEvent.objects.get_or_create(
                organization=org,
                type=event["type"],
                due_date=event["due_date"],
                defaults={"status": "upcoming"},
            )
            created += int(was_created)

        self.stdout.write(self.style.SUCCESS(f"Seeded {created} new compliance event(s) for {org.name}"))
