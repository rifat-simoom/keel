"""
Send invoice emails via Resend API.
Falls back silently if RESEND_API_KEY is not configured.
"""
import base64
import logging

import httpx

from shared.config import settings
from .models import Invoice

logger = logging.getLogger(__name__)

RESEND_API = "https://api.resend.com/emails"


async def send_invoice_email(invoice: Invoice, pdf_bytes: bytes, company_name: str) -> bool:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — invoice email not sent (invoice %s)", invoice.invoice_number)
        return False

    pdf_b64 = base64.b64encode(pdf_bytes).decode()
    filename = f"{invoice.invoice_number}.pdf"

    subject = f"Invoice {invoice.invoice_number} from {company_name}"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0057b8;">Invoice from {company_name}</h2>
      <p>Dear {invoice.client_name},</p>
      <p>Please find your invoice attached.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <tr>
          <td style="padding: 8px; color: #6b7280;">Invoice number</td>
          <td style="padding: 8px; font-weight: bold;">{invoice.invoice_number}</td>
        </tr>
        <tr style="background: #f9fafb;">
          <td style="padding: 8px; color: #6b7280;">Amount due</td>
          <td style="padding: 8px; font-weight: bold; color: #0057b8;">£{invoice.total:.2f}</td>
        </tr>
        <tr>
          <td style="padding: 8px; color: #6b7280;">Due date</td>
          <td style="padding: 8px;">{invoice.due_date}</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 13px;">
        If you have any questions, please reply to this email.
      </p>
      <p>Thank you for your business.</p>
      <p><strong>{company_name}</strong></p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px;">
        Sent via <a href="https://keelapp.co.uk" style="color: #0057b8;">Keel</a>
      </p>
    </div>
    """

    payload = {
        "from": f"{company_name} (via Keel) <invoices@keelapp.co.uk>",
        "to": [invoice.client_email],
        "subject": subject,
        "html": html_body,
        "attachments": [{"filename": filename, "content": pdf_b64}],
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                RESEND_API,
                json=payload,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            )
            if resp.status_code not in (200, 201):
                logger.error("Resend API error %s: %s", resp.status_code, resp.text)
                return False
            return True
    except Exception as exc:
        logger.error("Failed to send invoice email: %s", exc)
        return False
