import smtplib
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from app.core.config import settings
from app.core.logger import logger

_EMAILS_PATH = Path(__file__).parent.parent.parent / "admin_emails.json"


def load_admin_emails() -> list[str]:
    try:
        with open(_EMAILS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [entry["email"] for entry in data if entry.get("email")]
    except Exception as e:
        logger.error(f"Failed to load admin_emails.json: {e}")
        return []


def send_email(subject: str, html_body: str, recipients: list[str]) -> None:
    if not recipients:
        logger.warning("send_email: no recipients, skipping")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.MAIL_FROM
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT, timeout=10) as smtp:
            smtp.sendmail(settings.MAIL_FROM, recipients, msg.as_string())
        logger.info(f"Email sent | subject='{subject}' | recipients={len(recipients)}")
    except Exception as e:
        logger.error(f"Failed to send email | subject='{subject}' | error={e}")
        raise
