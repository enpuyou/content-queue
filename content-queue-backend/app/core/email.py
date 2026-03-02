import requests
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def _send_email(to_email: str, subject: str, html_content: str) -> None:
    """Send an email via the Resend HTTP API. Logs and no-ops if RESEND_API_KEY is not set."""

    if not settings.RESEND_API_KEY:
        logger.warning(
            f"RESEND_API_KEY not configured. Would have sent email to {to_email} "
            f"with subject '{subject}'."
        )
        logger.info(f"Email Content HTML:\n{html_content}")
        return

    payload = {
        "from": f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>",
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    try:
        response = requests.post(
            RESEND_API_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        response.raise_for_status()
        logger.info(
            f"Email successfully sent to {to_email} via Resend "
            f"(id={response.json().get('id')})"
        )
    except requests.exceptions.HTTPError as e:
        logger.error(
            f"Resend API error sending to {to_email}: "
            f"{e.response.status_code} {e.response.text}"
        )
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")


def send_verification_email(email_address: str, token: str) -> None:
    subject = "Verify your email address - sed.i"
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html_content = f"""
    <html>
      <body>
        <h2>Welcome to sed.i!</h2>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="{verify_url}">{verify_url}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request this, please ignore this email.</p>
      </body>
    </html>
    """
    _send_email(email_address, subject, html_content)


def send_password_reset_email(email_address: str, token: str) -> None:
    subject = "Reset your password - sed.i"
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html_content = f"""
    <html>
      <body>
        <h2>Password Reset Request</h2>
        <p>You recently requested to reset your password for your sed.i account.</p>
        <p>Please click the link below to reset it:</p>
        <p><a href="{reset_url}">{reset_url}</a></p>
        <p>This password reset is only valid for 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      </body>
    </html>
    """
    _send_email(email_address, subject, html_content)
