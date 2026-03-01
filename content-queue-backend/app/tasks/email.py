import logging
from app.core.celery_app import celery_app
from app.core.email import send_verification_email as _send_verification_email
from app.core.email import send_password_reset_email as _send_password_reset_email

logger = logging.getLogger(__name__)


@celery_app.task
def send_verification_email_task(email_address: str, token: str):
    logger.info(f"Sending verification email to {email_address}")
    _send_verification_email(email_address, token)


@celery_app.task
def send_password_reset_email_task(email_address: str, token: str):
    logger.info(f"Sending password reset email to {email_address}")
    _send_password_reset_email(email_address, token)
