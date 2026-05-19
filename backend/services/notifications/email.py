"""Send notification emails via Resend — best-effort, silent fallback."""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_ADDRESS = os.getenv("NOTIFICATION_FROM_EMAIL", "notifications@keelapp.co.uk")


async def send_notification_email(
    to: str,
    subject: str,
    body_html: str,
) -> bool:
    if not RESEND_API_KEY:
        logger.debug("RESEND_API_KEY not set — skipping email to %s", to)
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                json={"from": FROM_ADDRESS, "to": [to], "subject": subject, "html": body_html},
            )
            resp.raise_for_status()
            return True
    except Exception as exc:
        logger.warning("Email send failed: %s", exc)
        return False


def _deadline_html(title: str, description: str, route: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a">{title}</h2>
      <p style="color:#475569">{description}</p>
      <a href="https://keelapp.co.uk{route}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;
                border-radius:8px;text-decoration:none;margin-top:16px">
        View in Keel
      </a>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8">
        You received this because you have an account at keelapp.co.uk.
      </p>
    </div>"""
