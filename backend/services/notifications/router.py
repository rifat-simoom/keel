import logging
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.middleware.auth import CurrentUser, require_auth

from .database import get_db
from . import repository as repo
from . import deadlines as dl
from .models import Notification
from .schemas import (
    DeadlineResponse,
    NotificationListResponse,
    NotificationResponse,
    RegisterDeviceRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["notifications"])


async def _get_company(db: AsyncSession, user: CurrentUser) -> UUID:
    company_id = await repo.get_company_id_for_user(db, user.sub)
    if not company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return company_id


async def _get_company_settings(db: AsyncSession, company_id: UUID) -> dict:
    result = await db.execute(
        text("""
            SELECT is_vat_registered, vat_stagger, year_end_month
            FROM companies WHERE id = :cid
        """),
        {"cid": str(company_id)},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else {}


async def _get_open_invoices(db: AsyncSession, company_id: UUID) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT id, invoice_number, client_name, total, due_date, status
            FROM invoices
            WHERE company_id = :cid
              AND status IN ('sent', 'viewed')
              AND deleted_at IS NULL
              AND due_date >= CURRENT_DATE
            ORDER BY due_date
            LIMIT 20
        """),
        {"cid": str(company_id)},
    )
    return [dict(r) for r in result.mappings().all()]


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    company_id = await _get_company(db, current_user)
    items, total, unread = await repo.list_notifications(db, company_id, page, page_size, unread_only)
    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in items],
        total=total,
        unread_count=unread,
    )


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    company_id = await _get_company(db, current_user)
    found = await repo.mark_read(db, notification_id, company_id)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    await db.commit()


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    company_id = await _get_company(db, current_user)
    await repo.mark_all_read(db, company_id)
    await db.commit()


@router.post("/notifications/register-device", status_code=status.HTTP_204_NO_CONTENT)
async def register_device(
    body: RegisterDeviceRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    company_id = await _get_company(db, current_user)
    await repo.upsert_device_token(db, company_id, body.token, body.platform)
    await db.commit()


# ── Deadlines ─────────────────────────────────────────────────────────────────

@router.get("/deadlines", response_model=list[DeadlineResponse])
async def list_deadlines(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> list[DeadlineResponse]:
    company_id = await _get_company(db, current_user)
    settings = await _get_company_settings(db, company_id)
    today = date.today()

    all_deadlines: list[dict] = []

    if settings.get("is_vat_registered"):
        all_deadlines += dl.vat_deadlines(settings.get("vat_stagger") or "A", today)

    all_deadlines += dl.corp_tax_deadlines(settings.get("year_end_month") or 3, today)
    all_deadlines += dl.self_assessment_deadlines(today)

    invoices = await _get_open_invoices(db, company_id)
    all_deadlines += dl.invoice_deadlines(invoices, today)

    all_deadlines.sort(key=lambda d: d["due_date"])
    return [DeadlineResponse(**d) for d in all_deadlines]


@router.get("/deadlines/next", response_model=DeadlineResponse | None)
async def next_deadline(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> DeadlineResponse | None:
    company_id = await _get_company(db, current_user)
    settings = await _get_company_settings(db, company_id)
    today = date.today()

    all_deadlines: list[dict] = []
    if settings.get("is_vat_registered"):
        all_deadlines += dl.vat_deadlines(settings.get("vat_stagger") or "A", today)
    all_deadlines += dl.corp_tax_deadlines(settings.get("year_end_month") or 3, today)
    all_deadlines += dl.self_assessment_deadlines(today)
    invoices = await _get_open_invoices(db, company_id)
    all_deadlines += dl.invoice_deadlines(invoices, today)

    if not all_deadlines:
        return None
    return DeadlineResponse(**min(all_deadlines, key=lambda d: d["due_date"]))
