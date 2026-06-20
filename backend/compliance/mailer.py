"""Sending compliance-reminder emails through each org's own SMTP server."""

from django.core.mail import EmailMessage, get_connection

from .models import OrgEmailConfig


def build_connection(config: OrgEmailConfig):
    """An SMTP connection bound to a single org's saved credentials."""
    return get_connection(
        backend="django.core.mail.backends.smtp.EmailBackend",
        host=config.host,
        port=config.port,
        username=config.username,
        password=config.get_password(),
        use_tls=config.use_tls,
        fail_silently=False,
    )


def send_email(config: OrgEmailConfig, subject: str, body: str, recipients: list[str]) -> int:
    """Send one email via the org's SMTP config. Returns count of messages sent."""
    connection = build_connection(config)
    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=config.from_email,
        to=recipients,
        connection=connection,
    )
    return message.send()


def reminder_body(event) -> str:
    label = event.category or event.get_type_display()
    return (
        f"This is an automated reminder from ComplianceAI.\n\n"
        f"Obligation: {label}\n"
        f"Type: {event.get_type_display()}\n"
        f"Due date: {event.due_date:%Y-%m-%d}\n"
        f"Status: {event.get_status_display()}\n\n"
        f"Please ensure this obligation is addressed before its due date.\n\n"
        f"— ComplianceAI\n"
        f"This message is informational only and does not constitute legal advice."
    )
