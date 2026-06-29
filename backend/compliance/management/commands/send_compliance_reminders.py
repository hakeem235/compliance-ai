"""Send reminder emails for compliance events approaching their due date.

Run on a schedule (e.g. daily via cron):

    */1440 * * * *  cd /path/to/backend && python manage.py send_compliance_reminders

Each org's mail is sent through that org's own saved SMTP config. An event is
reminded once (reminder_sent_at), for events due within the reminder window,
not resolved, and with at least one notify_emails recipient.
"""

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from compliance.mailer import reminder_body, send_email
from compliance.models import ComplianceEvent, OrgEmailConfig


class Command(BaseCommand):
    help = "Email reminders for upcoming compliance deadlines via each org's SMTP config."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List what would be sent without sending or marking events.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        window_days = settings.COMPLIANCE_REMINDER_WINDOW_DAYS
        today = timezone.now().date()
        cutoff = today + timedelta(days=window_days)

        due_events = ComplianceEvent.objects.filter(
            reminder_sent_at__isnull=True,
            due_date__lte=cutoff,
        ).exclude(status="resolved").order_by("organization_id", "due_date")

        sent_count = 0
        skipped_no_config = 0
        skipped_no_recipients = 0

        for event in due_events:
            recipients = [e for e in (event.notify_emails or []) if e]
            if not recipients:
                skipped_no_recipients += 1
                continue
            config = OrgEmailConfig.for_org(event.organization_id)
            if not config or not config.has_password:
                skipped_no_config += 1
                continue

            label = event.category or event.get_type_display()
            if dry_run:
                self.stdout.write(f"[dry-run] would email {recipients} re: {label} (due {event.due_date})")
                continue

            try:
                send_email(
                    config,
                    subject=f"Compliance reminder: {label} due {event.due_date:%Y-%m-%d}",
                    body=reminder_body(event),
                    recipients=recipients,
                )
            except Exception as exc:  # noqa: BLE001 — keep going for other orgs/events
                self.stderr.write(f"Failed to send for event {event.id}: {exc}")
                continue

            event.reminder_sent_at = timezone.now()
            event.save(update_fields=["reminder_sent_at"])
            sent_count += 1
            self.stdout.write(f"Sent reminder for {label} (due {event.due_date}) to {recipients}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. sent={sent_count} skipped_no_config={skipped_no_config} "
                f"skipped_no_recipients={skipped_no_recipients} dry_run={dry_run}"
            )
        )
