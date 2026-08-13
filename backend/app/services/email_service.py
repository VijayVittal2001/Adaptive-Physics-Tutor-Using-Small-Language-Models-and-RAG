from email.message import EmailMessage
from pathlib import Path
import smtplib
from app.core.config import settings
from app.database.db import now_iso


def send_verification_email(to_email: str, name: str, verify_url: str) -> dict:
    subject = "Verify your PhysTutor AI account"
    body = f"""Hello {name},

Click this link to verify your PhysTutor AI student account:
{verify_url}

If you did not create this account, ignore this email.
"""
    if settings.smtp_host and settings.smtp_user and settings.smtp_password:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from
        msg["To"] = to_email
        msg.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
        return {"sent": True, "mode": "smtp"}

    # Local development fallback: still creates a real clickable link, but saves it to local outbox.
    settings.email_outbox_dir.mkdir(parents=True, exist_ok=True)
    safe = to_email.replace("@", "_at_").replace(".", "_")
    out = settings.email_outbox_dir / f"verify_{safe}_{now_iso().replace(':','-')}.txt"
    out.write_text(f"{subject}\n\n{body}", encoding="utf-8")
    return {"sent": False, "mode": "local_outbox", "outboxFile": str(out)}
