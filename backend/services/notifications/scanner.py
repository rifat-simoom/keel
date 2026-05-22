"""
Background scanner that runs every hour:
- Marks invoices as overdue when past due_date
- Creates in-app notifications for overdue invoices
- Creates in-app notifications for approaching deadlines (30d / 7d / 1d)
- Sends email for deadline alerts
"""
import asyncio
import logging
from datetime import date
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .database import AsyncSessionLocal
from . import repository as repo
from . import deadlines as dl
from .email import send_notification_email, _deadline_html

logger = logging.getLogger(__name__)

DEADLINE_ALERT_DAYS = {30, 7, 1}


async def _get_all_companies(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT id, name, vat_scheme, vat_stagger, year_end_month, is_vat_registered
            FROM companies
        """)
    )
    return [dict(r) for r in result.mappings().all()]


async def _get_company_email(db: AsyncSession, company_id: UUID) -> str | None:
    result = await db.execute(
        text("SELECT email FROM user_profiles WHERE company_id = :cid LIMIT 1"),
        {"cid": str(company_id)},
    )
    row = result.one_or_none()
    return row[0] if row else None


async def _get_overdue_invoices(db: AsyncSession, company_id: UUID) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT id, invoice_number, client_name, total, due_date, status
            FROM invoices
            WHERE company_id = :cid
              AND status IN ('sent', 'viewed')
              AND due_date < CURRENT_DATE
              AND deleted_at IS NULL
        """),
        {"cid": str(company_id)},
    )
    return [dict(r) for r in result.mappings().all()]


async def _mark_invoice_overdue(db: AsyncSession, invoice_id: str) -> None:
    await db.execute(
        text("UPDATE invoices SET status = 'overdue', updated_at = NOW() WHERE id = :id"),
        {"id": invoice_id},
    )


async def _deadline_already_notified(
    db: AsyncSession, company_id: UUID, deadline_type: str, due_date: date
) -> bool:
    """Check if a deadline notification was already sent for this exact deadline."""
    result = await db.execute(
        text("""
            SELECT 1 FROM notifications
            WHERE company_id = :cid
              AND notification_type = :type
              AND payload->>'due_date' = :due
              AND created_at > NOW() - INTERVAL '25 days'
            LIMIT 1
        """),
        {"cid": str(company_id), "type": deadline_type, "due": due_date.isoformat()},
    )
    return result.one_or_none() is not None


async def scan_once() -> None:
    async with AsyncSessionLocal() as db:
        companies = await _get_all_companies(db)
        today = date.today()

        for company in companies:
            company_id = UUID(str(company["id"]))

            # ── Mark overdue invoices ─────────────────────────────────────────
            overdue = await _get_overdue_invoices(db, company_id)
            for inv in overdue:
                await _mark_invoice_overdue(db, str(inv["id"]))
                already = await _deadline_already_notified(
                    db, company_id, "invoice_overdue", inv["due_date"]
                )
                if not already:
                    await repo.create_notification(
                        db,
                        company_id=company_id,
                        notification_type="invoice_overdue",
                        title=f"Invoice {inv['invoice_number']} is overdue",
                        body=f"{inv['client_name']} has not paid invoice {inv['invoice_number']} (£{float(inv['total']):,.2f}). It was due {inv['due_date']}.",
                        route=f"/invoices/{inv['id']}",
                        payload={"due_date": str(inv["due_date"]), "invoice_id": str(inv["id"])},
                    )
                    email = await _get_company_email(db, company_id)
                    if email:
                        await send_notification_email(
                            to=email,
                            subject=f"Invoice {inv['invoice_number']} is overdue",
                            body_html=_deadline_html(
                                f"Invoice {inv['invoice_number']} is overdue",
                                f"{inv['client_name']} has not paid. It was due {inv['due_date']}.",
                                f"/invoices/{inv['id']}",
                            ),
                        )

            # ── Tax / HMRC deadline alerts ────────────────────────────────────
            all_deadlines: list[dict] = []

            if company.get("is_vat_registered"):
                all_deadlines += dl.vat_deadlines(company.get("vat_stagger") or "A", today)

            all_deadlines += dl.corp_tax_deadlines(company.get("year_end_month") or 3, today)
            all_deadlines += dl.self_assessment_deadlines(today)

            for d in all_deadlines:
                if d["days_until"] not in DEADLINE_ALERT_DAYS:
                    continue
                already = await _deadline_already_notified(
                    db, company_id, d["deadline_type"], d["due_date"]
                )
                if already:
                    continue

                await repo.create_notification(
                    db,
                    company_id=company_id,
                    notification_type=d["deadline_type"],
                    title=d["title"],
                    body=d["description"],
                    route=d["route"],
                    payload={"due_date": d["due_date"].isoformat()},
                )
                # Email for 30d and 7d warnings
                if d["days_until"] in {30, 7}:
                    email = await _get_company_email(db, company_id)
                    if email:
                        await send_notification_email(
                            to=email,
                            subject=d["title"],
                            body_html=_deadline_html(d["title"], d["description"], d["route"]),
                        )

        await db.commit()
        logger.info("Scan complete — processed %d companies", len(companies))


async def run_scanner(interval_seconds: int = 3600) -> None:
    """Run scan_once on startup, then repeat every interval_seconds."""
    while True:
        try:
            await scan_once()
        except Exception as exc:
            logger.error("Scanner error: %s", exc)
        await asyncio.sleep(interval_seconds)
