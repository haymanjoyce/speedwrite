import os

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@speedwrite.app")
APP_URL = os.getenv("APP_URL", "http://localhost")


def send_email(to_email: str, subject: str, body: str) -> None:
    """Send a plain-text email. Raises on failure."""
    message = Mail(
        from_email=EMAIL_FROM,
        to_emails=to_email,
        subject=subject,
        plain_text_content=body,
    )
    sg = SendGridAPIClient(SENDGRID_API_KEY)
    sg.send(message)


def send_password_reset_email(to_email: str, token: str) -> None:
    """Send password reset link. Raises on failure."""
    reset_url = f"{APP_URL}/reset-password/confirm?token={token}"
    message = Mail(
        from_email=EMAIL_FROM,
        to_emails=to_email,
        subject="Reset your SpeedWrite password",
        html_content=(
            f"<p>Click the link below to reset your password. "
            f"This link expires in 1 hour.</p>"
            f"<p><a href='{reset_url}'>{reset_url}</a></p>"
            f"<p>If you did not request a password reset, ignore this email.</p>"
        ),
    )
    sg = SendGridAPIClient(SENDGRID_API_KEY)
    sg.send(message)
