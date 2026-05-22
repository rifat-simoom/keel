"""DB queries for the tax service — all raw SQL against shared tables."""
from datetime import date
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def get_company_settings(db: AsyncSession, company_id: UUID) -> dict | None:
    result = await db.execute(
        text("""
            SELECT name, vat_number, is_vat_registered, vat_scheme, vat_stagger,
                   year_end_month, payment_terms_days
            FROM companies WHERE id = :cid
        """),
        {"cid": str(company_id)},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def get_company_id_for_user(db: AsyncSession, keycloak_id: UUID) -> UUID | None:
    result = await db.execute(
        text("SELECT company_id FROM user_profiles WHERE keycloak_id = :kid"),
        {"kid": str(keycloak_id)},
    )
    row = result.one_or_none()
    return UUID(str(row[0])) if row and row[0] else None


async def get_paid_invoices_for_year(
    db: AsyncSession, company_id: UUID, year_start: date, year_end: date
) -> list[dict]:
    """Return subtotal and vat_amount for paid invoices in the tax year."""
    result = await db.execute(
        text("""
            SELECT subtotal, vat_amount, total, paid_at, issue_date
            FROM invoices
            WHERE company_id = :cid
              AND status = 'paid'
              AND deleted_at IS NULL
              AND paid_at::date BETWEEN :start AND :end
        """),
        {"cid": str(company_id), "start": year_start, "end": year_end},
    )
    return [dict(r) for r in result.mappings().all()]


async def get_expenses_for_year(
    db: AsyncSession, company_id: UUID, year_start: date, year_end: date
) -> list[dict]:
    """Return expenses from transactions (negative amounts flagged as is_expense)."""
    result = await db.execute(
        text("""
            SELECT t.amount, t.category, t.transaction_date
            FROM transactions t
            JOIN accounts a ON a.id = t.account_id
            WHERE a.company_id = :cid
              AND t.is_expense = TRUE
              AND t.amount < 0
              AND t.deleted_at IS NULL
              AND t.transaction_date BETWEEN :start AND :end
        """),
        {"cid": str(company_id), "start": year_start, "end": year_end},
    )
    return [dict(r) for r in result.mappings().all()]


async def get_invoices_for_vat_period(
    db: AsyncSession, company_id: UUID, period_start: date, period_end: date,
    vat_scheme: str,
) -> list[dict]:
    """
    Cash accounting: invoices where paid_at falls in the period.
    Standard accrual: invoices where issue_date falls in the period.
    """
    if vat_scheme == "cash":
        condition = "status = 'paid' AND paid_at::date BETWEEN :start AND :end"
    else:
        condition = "issue_date BETWEEN :start AND :end AND status != 'cancelled'"

    result = await db.execute(
        text(f"""
            SELECT vat_amount, status, issue_date, paid_at
            FROM invoices
            WHERE company_id = :cid
              AND deleted_at IS NULL
              AND {condition}
        """),
        {"cid": str(company_id), "start": period_start, "end": period_end},
    )
    return [dict(r) for r in result.mappings().all()]


async def get_input_vat_for_period(
    db: AsyncSession, company_id: UUID, period_start: date, period_end: date,
) -> list[dict]:
    """Input VAT from receipts (documents) in the period."""
    result = await db.execute(
        text("""
            SELECT vat_amount, expense_date
            FROM documents
            WHERE company_id = :cid
              AND deleted_at IS NULL
              AND vat_amount IS NOT NULL
              AND vat_amount > 0
              AND expense_date BETWEEN :start AND :end
        """),
        {"cid": str(company_id), "start": period_start, "end": period_end},
    )
    return [dict(r) for r in result.mappings().all()]
