"""
email_utils.py — sends transactional email (verification, password reset)
via plain stdlib smtplib if SMTP_HOST/SMTP_USER/SMTP_PASS are set in the
environment. If they aren't configured, nothing breaks: the caller gets
`sent=False` back and should surface the link directly to the user (dev
mode), which is what auth.py does. This means email verification and
password reset both work out of the box on a fresh deploy with zero email
setup — you just see the link instead of receiving it in your inbox.
"""
import os
import smtplib
import ssl
from email.message import EmailMessage

SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")
FROM_EMAIL = os.environ.get("FROM_EMAIL", SMTP_USER or "noreply@studyos.ai")

EMAIL_CONFIGURED = bool(SMTP_HOST and SMTP_USER and SMTP_PASS)


def send_email(to, subject, body_text):
    """Returns True if actually sent, False if SMTP isn't configured (caller should fall back to showing the link)."""
    if not EMAIL_CONFIGURED:
        print(f"[email disabled — SMTP not configured] To: {to} | Subject: {subject}\n{body_text}\n")
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to
    msg.set_content(body_text)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[email send failed] {e}")
        return False
