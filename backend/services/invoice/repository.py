from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import Invoice, InvoiceEvent, InvoiceSequence
from .schemas import CreateInvoiceRequest, UpdateInvoiceRequest

SENT_STATUSES = {"sent", "viewed", "paid", "overdue"}


# ── Company lookup (same DB as auth-service) ─────────────────────────────────

async def get_company_id_for_user(db: AsyncSession, keycloak_id: UUID) -> UUID | None:
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT company_id FROM user_profiles WHERE keycloak_id = :kid"),
        {"kid": str(keycloak_id)},
    )
    row = result.one_or_none()
    return UUID(str(row[0])) if row and row[0] else None


async def get_company_name(db: AsyncSession, company_id: UUID) -> str:
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT name FROM companies WHERE id = :cid"),
        {"cid": str(company_id)},
    )
    row = result.one_or_none()
    return row[0] if row else "Your Company"


# ── Sequential invoice numbering ─────────────────────────────────────────────

async def next_invoice_number(db: AsyncSession, company_id: UUID) -> str:
    """Atomically increment and return the next INV-YYYY-NNN number."""
    year = datetime.now().year
    result = await db.execute(
        select(InvoiceSequence).where(
            InvoiceSequence.company_id == company_id,
            InvoiceSequence.year == year,
        ).with_for_update()
    )
    seq = result.scalar_one_or_none()
    if seq is None:
        seq = InvoiceSequence(company_id=company_id, year=year, last_number=0)
        db.add(seq)
        await db.flush()

    seq.last_number += 1
    await db.flush()
    return f"INV-{year}-{seq.last_number:03d}"


# ── Invoice CRUD ──────────────────────────────────────────────────────────────

def _compute_totals(
    line_items: list[dict],
) -> tuple[Decimal, Decimal, Decimal]:
    subtotal = Decimal("0")
    vat_amount = Decimal("0")
    for item in line_items:
        qty = Decimal(str(item["quantity"]))
        price = Decimal(str(item["unit_price"]))
        vat_rate = Decimal(str(item["vat_rate"]))
        line_net = qty * price
        subtotal += line_net
        vat_amount += line_net * vat_rate
    return subtotal.quantize(Decimal("0.01")), vat_amount.quantize(Decimal("0.01")), (subtotal + vat_amount).quantize(Decimal("0.01"))


async def create_invoice(
    db: AsyncSession,
    company_id: UUID,
    user_id: UUID,
    body: CreateInvoiceRequest,
) -> Invoice:
    number = await next_invoice_number(db, company_id)
    items = [i.model_dump() for i in body.line_items]
    subtotal, vat_amount, total = _compute_totals(items)

    invoice = Invoice(
        company_id=company_id,
        invoice_number=number,
        client_name=body.client_name,
        client_email=body.client_email,
        client_address=body.client_address.model_dump() if body.client_address else None,
        line_items=items,
        subtotal=subtotal,
        vat_amount=vat_amount,
        total=total,
        issue_date=body.issue_date,
        due_date=body.due_date,
        notes=body.notes,
        created_by=user_id,
        updated_by=user_id,
    )
    db.add(invoice)
    await db.flush()
    await _add_event(db, invoice.id, "created")
    await db.refresh(invoice, ["events"])
    return invoice


async def get_invoice(
    db: AsyncSession, invoice_id: UUID, company_id: UUID
) -> Invoice | None:
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.events))
        .where(
            Invoice.id == invoice_id,
            Invoice.company_id == company_id,
            Invoice.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def list_invoices(
    db: AsyncSession,
    company_id: UUID,
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
) -> tuple[list[Invoice], int]:
    filters = [Invoice.company_id == company_id, Invoice.deleted_at.is_(None)]
    if status:
        filters.append(Invoice.status == status)

    count = (await db.execute(
        select(func.count()).select_from(Invoice).where(and_(*filters))
    )).scalar() or 0

    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.events))
        .where(and_(*filters))
        .order_by(Invoice.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), count


async def update_invoice(
    db: AsyncSession,
    invoice: Invoice,
    user_id: UUID,
    body: UpdateInvoiceRequest,
) -> Invoice:
    if invoice.status in SENT_STATUSES:
        raise ValueError("Cannot edit an invoice that has already been sent")
    if body.client_name is not None:
        invoice.client_name = body.client_name
    if body.client_email is not None:
        invoice.client_email = body.client_email
    if body.client_address is not None:
        invoice.client_address = body.client_address.model_dump()
    if body.line_items is not None:
        items = [i.model_dump() for i in body.line_items]
        invoice.line_items = items
        invoice.subtotal, invoice.vat_amount, invoice.total = _compute_totals(items)
    if body.issue_date is not None:
        invoice.issue_date = body.issue_date
    if body.due_date is not None:
        invoice.due_date = body.due_date
    if body.notes is not None:
        invoice.notes = body.notes
    invoice.updated_by = user_id
    await db.flush()
    return invoice


async def send_invoice(db: AsyncSession, invoice: Invoice) -> Invoice:
    if invoice.status != "draft":
        raise ValueError(f"Cannot send an invoice with status '{invoice.status}'")
    invoice.status = "sent"
    await db.flush()
    await _add_event(db, invoice.id, "sent")
    return invoice


async def mark_paid(
    db: AsyncSession, invoice: Invoice, user_id: UUID
) -> Invoice:
    if invoice.status not in ("sent", "viewed", "overdue"):
        raise ValueError(f"Cannot mark paid from status '{invoice.status}'")
    invoice.status = "paid"
    invoice.paid_at = datetime.now(timezone.utc)
    invoice.updated_by = user_id
    await db.flush()
    await _add_event(db, invoice.id, "paid", {"amount": str(invoice.total)})

    # Credit the banking account directly (same DB, same transaction)
    await _credit_banking_account(db, invoice)
    return invoice


async def _credit_banking_account(db: AsyncSession, invoice: Invoice) -> None:
    """Write a transaction to the banking tables when invoice is paid."""
    from sqlalchemy import text
    # Find account for this company
    result = await db.execute(
        text("SELECT id, balance FROM accounts WHERE company_id = :cid LIMIT 1"),
        {"cid": str(invoice.company_id)},
    )
    row = result.one_or_none()
    if not row:
        return
    account_id, balance = row
    new_balance = Decimal(str(balance)) + invoice.total

    # Insert transaction
    await db.execute(
        text("""
            INSERT INTO transactions
                (id, account_id, amount, description, category, transaction_date,
                 is_expense, invoice_id, created_at, updated_at)
            VALUES
                (gen_random_uuid(), :account_id, :amount, :desc, 'PROFESSIONAL',
                 CURRENT_DATE, FALSE, :invoice_id, NOW(), NOW())
        """),
        {
            "account_id": str(account_id),
            "amount": str(invoice.total),
            "desc": f"Invoice {invoice.invoice_number} — {invoice.client_name}",
            "invoice_id": str(invoice.id),
        },
    )
    # Update balance
    await db.execute(
        text("UPDATE accounts SET balance = :bal WHERE id = :aid"),
        {"bal": str(new_balance), "aid": str(account_id)},
    )


async def cancel_invoice(
    db: AsyncSession, invoice: Invoice, user_id: UUID
) -> Invoice:
    if invoice.status in ("paid", "cancelled"):
        raise ValueError(f"Cannot cancel an invoice with status '{invoice.status}'")
    if invoice.status in SENT_STATUSES - {"paid"}:
        await _add_event(db, invoice.id, "credit_note_required")
    invoice.status = "cancelled"
    invoice.updated_by = user_id
    await db.flush()
    await _add_event(db, invoice.id, "cancelled")
    return invoice


async def mark_viewed(db: AsyncSession, invoice: Invoice) -> Invoice:
    if invoice.status == "sent":
        invoice.status = "viewed"
        await db.flush()
        await _add_event(db, invoice.id, "viewed")
    return invoice


async def get_stats(db: AsyncSession, company_id: UUID) -> dict:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(Invoice).where(
            Invoice.company_id == company_id,
            Invoice.deleted_at.is_(None),
        )
    )
    invoices = result.scalars().all()

    outstanding = sum(
        i.total for i in invoices if i.status in ("sent", "viewed")
    )
    overdue_items = [i for i in invoices if i.status == "overdue"]
    paid_this_month = sum(
        i.total for i in invoices
        if i.status == "paid" and i.paid_at and i.paid_at >= month_start
    )
    draft_count = sum(1 for i in invoices if i.status == "draft")

    return {
        "total_outstanding": outstanding,
        "total_overdue": sum(i.total for i in overdue_items),
        "overdue_count": len(overdue_items),
        "paid_this_month": paid_this_month,
        "draft_count": draft_count,
    }


async def _add_event(
    db: AsyncSession, invoice_id: UUID, event_type: str, metadata: dict | None = None
) -> None:
    db.add(InvoiceEvent(invoice_id=invoice_id, event_type=event_type, event_data=metadata))
    await db.flush()
