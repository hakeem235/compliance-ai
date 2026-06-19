"""
Seeds realistic Saudi regulatory deadlines as ComplianceEvent rows for an
organization, derived from Saudi_Arabia_Governance_Compliance.md: ZATCA
VAT/WHT/CIT-Zakat filing calendar, plus CMA disclosure, ESG reporting and
CGR internal audit deadlines (tagged via the free-text `category` field
since they don't fit the fixed `type` choices). Run with:

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


def _fiscal_year_end(today: date) -> date:
    fiscal_year_end = date(today.year, 12, 31)
    if today > fiscal_year_end:
        fiscal_year_end = date(today.year + 1, 12, 31)
    return fiscal_year_end


def _fiscal_year_end_plus_120_days(today: date) -> date:
    return _fiscal_year_end(today) + timedelta(days=120)


def _next_quarter_end_plus_days(today: date, days: int) -> date:
    quarter_end_month = ((today.month - 1) // 3 + 1) * 3
    quarter_end = _add_months(date(today.year, quarter_end_month, 1), 1) - timedelta(days=1)
    deadline = quarter_end + timedelta(days=days)
    if deadline <= today:
        quarter_end_month = quarter_end_month + 3
        year = today.year
        if quarter_end_month > 12:
            quarter_end_month -= 12
            year += 1
        quarter_end = _add_months(date(year, quarter_end_month, 1), 1) - timedelta(days=1)
        deadline = quarter_end + timedelta(days=days)
    return deadline


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
            {"type": "tax_deadline", "category": "", "due_date": _next_month_on_day(today, 20)},
            # WHT remittance on payments to non-residents
            {"type": "tax_deadline", "category": "", "due_date": _next_month_on_day(today, 10)},
            # Annual CIT/Zakat return — 120 days after fiscal year-end (assumed Dec 31)
            {"type": "tax_deadline", "category": "", "due_date": _fiscal_year_end_plus_120_days(today)},
            # CMA continuous disclosure — audited quarterly financial statements
            {
                "type": "license_renewal",
                "category": "CMA Disclosure — Quarterly Financial Statements",
                "due_date": _next_quarter_end_plus_days(today, 20),
            },
            # ESG annual disclosure, aligned to the financial reporting cycle (CMA/Tadawul)
            {
                "type": "license_renewal",
                "category": "ESG Reporting (Annual)",
                "due_date": _fiscal_year_end(today) + timedelta(days=90),
            },
            # Internal Audit Report — mandatory since Jan 2024, CGR Arts. 73-75
            {
                "type": "license_renewal",
                "category": "Internal Audit Report (CGR Arts. 73-75)",
                "due_date": _fiscal_year_end(today) + timedelta(days=60),
            },
        ]

        created = 0
        for event in events:
            _, was_created = ComplianceEvent.objects.get_or_create(
                organization=org,
                type=event["type"],
                category=event["category"],
                due_date=event["due_date"],
                defaults={"status": "upcoming"},
            )
            created += int(was_created)

        self.stdout.write(self.style.SUCCESS(f"Seeded {created} new compliance event(s) for {org.name}"))
