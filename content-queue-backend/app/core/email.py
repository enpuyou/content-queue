import smtplib
from email.message import EmailMessage
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


def _send_email(to_email: str, subject: str, html_content: str) -> None:
    """Send an email using SMTP. If SMTP_HOST is not configured, just log it."""

    if not settings.SMTP_HOST:
        logger.warning(
            f"SMTP_HOST not configured. Would have sent email to {to_email} with subject '{subject}'."
        )
        logger.info(f"Email Content HTML:\n{html_content}")
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    msg["To"] = to_email

    msg.add_alternative(html_content, subtype="html")

    try:
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        logger.info(f"Email successfully sent to {to_email}")
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
