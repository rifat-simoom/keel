import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.middleware.auth import CurrentUser, require_auth

from .database import get_db
from . import repository as repo
from .schemas import (
    CreateInvoiceRequest,
    InvoiceListResponse,
    InvoiceResponse,
    InvoiceStatsResponse,
    UpdateInvoiceRequest,
)
from .pdf import generate_invoice_pdf
from .email import send_invoice_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/invoices", tags=["invoices"])


async def _get_company(db: AsyncSession, user: CurrentUser) -> UUID:
    cid = await repo.get_company_id_for_user(db, user.sub)
    if not cid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found — complete onboarding first",
        )
    return cid


async def _get_invoice_or_404(db: AsyncSession, invoice_id: UUID, company_id: UUID):
    inv = await repo.get_invoice(db, invoice_id, company_id)
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return inv


# ── List & Stats ─────────────────────────────────────────────────────────────

@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> InvoiceListResponse:
    company_id = await _get_company(db, current_user)
    items, total = await repo.list_invoices(db, company_id, page, page_size, status)
    return InvoiceListResponse(
        items=[InvoiceResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/stats", response_model=InvoiceStatsResponse)
async def get_stats(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> InvoiceStatsResponse:
    company_id = await _get_company(db, current_user)
    stats = await repo.get_stats(db, company_id)
    return InvoiceStatsResponse(**stats)


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    body: CreateInvoiceRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    if not body.line_items:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="At least one line item required")
    company_id = await _get_company(db, current_user)
    invoice = await repo.create_invoice(db, company_id, current_user.sub, body)
    await db.commit()
    await db.refresh(invoice, ["events"])
    return InvoiceResponse.model_validate(invoice)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    company_id = await _get_company(db, current_user)
    return InvoiceResponse.model_validate(await _get_invoice_or_404(db, invoice_id, company_id))


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    body: UpdateInvoiceRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    company_id = await _get_company(db, current_user)
    invoice = await _get_invoice_or_404(db, invoice_id, company_id)
    try:
        invoice = await repo.update_invoice(db, invoice, current_user.sub, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    await db.commit()
    await db.refresh(invoice, ["events"])
    return InvoiceResponse.model_validate(invoice)


# ── State transitions ─────────────────────────────────────────────────────────

@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice(
    invoice_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    company_id = await _get_company(db, current_user)
    invoice = await _get_invoice_or_404(db, invoice_id, company_id)
    try:
        invoice = await repo.send_invoice(db, invoice)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    await db.commit()
    await db.refresh(invoice, ["events"])

    # Generate PDF and email asynchronously (best-effort)
    company_name = await repo.get_company_name(db, company_id)
    pdf_bytes = generate_invoice_pdf(invoice, company_name)
    email_sent = await send_invoice_email(invoice, pdf_bytes, company_name)
    if not email_sent:
        logger.info("Invoice %s sent but email delivery skipped (no API key or error)", invoice.invoice_number)

    return InvoiceResponse.model_validate(invoice)


@router.post("/{invoice_id}/mark-paid", response_model=InvoiceResponse)
async def mark_paid(
    invoice_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    company_id = await _get_company(db, current_user)
    invoice = await _get_invoice_or_404(db, invoice_id, company_id)
    try:
        invoice = await repo.mark_paid(db, invoice, current_user.sub)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    await db.commit()
    await db.refresh(invoice, ["events"])
    return InvoiceResponse.model_validate(invoice)


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
async def cancel_invoice(
    invoice_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    company_id = await _get_company(db, current_user)
    invoice = await _get_invoice_or_404(db, invoice_id, company_id)
    try:
        invoice = await repo.cancel_invoice(db, invoice, current_user.sub)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    await db.commit()
    await db.refresh(invoice, ["events"])
    return InvoiceResponse.model_validate(invoice)


# ── PDF download ──────────────────────────────────────────────────────────────

@router.get("/{invoice_id}/pdf")
async def download_pdf(
    invoice_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> Response:
    company_id = await _get_company(db, current_user)
    invoice = await _get_invoice_or_404(db, invoice_id, company_id)
    company_name = await repo.get_company_name(db, company_id)
    pdf_bytes = generate_invoice_pdf(invoice, company_name)
    filename = f"{invoice.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
