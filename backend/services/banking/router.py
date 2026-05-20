import logging
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.middleware.auth import CurrentUser, require_auth

from .database import get_db
from . import repository as repo
from .schemas import (
    AccountResponse,
    AccountStatsResponse,
    CreateTransactionRequest,
    TransactionListResponse,
    TransactionResponse,
    UpdateCategoryRequest,
    VirtualCardResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["banking"])


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_create_account(db: AsyncSession, user: CurrentUser):
    company_id = await repo.get_company_id_for_user(db, user.sub)
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found — complete onboarding first",
        )
    return await repo.get_or_create_account(db, company_id)


# ── Account ───────────────────────────────────────────────────────────────────

@router.get("/accounts/me", response_model=AccountResponse)
async def get_my_account(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> AccountResponse:
    account = await _get_or_create_account(db, current_user)
    return AccountResponse.model_validate(account)


@router.get("/accounts/me/stats", response_model=AccountStatsResponse)
async def get_account_stats(
    period_days: int = Query(default=30, ge=7, le=365),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> AccountStatsResponse:
    account = await _get_or_create_account(db, current_user)
    stats = await repo.get_account_stats(db, account.id, period_days)
    return AccountStatsResponse(**stats)


# ── Transactions ──────────────────────────────────────────────────────────────

@router.get("/transactions", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> TransactionListResponse:
    account = await _get_or_create_account(db, current_user)
    items, total = await repo.list_transactions(
        db, account.id, page, page_size, category, search, date_from, date_to
    )
    return TransactionListResponse(
        items=[TransactionResponse.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> TransactionResponse:
    account = await _get_or_create_account(db, current_user)
    txn = await repo.get_transaction(db, transaction_id, account.id)
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return TransactionResponse.model_validate(txn)


@router.post("/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: CreateTransactionRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> TransactionResponse:
    account = await _get_or_create_account(db, current_user)
    txn = await repo.create_transaction(
        db,
        account=account,
        amount=body.amount,
        description=body.description,
        transaction_date=body.transaction_date,
        category=body.category,
        merchant_name=body.merchant_name,
        is_expense=body.is_expense,
    )
    await db.commit()
    await db.refresh(txn)
    return TransactionResponse.model_validate(txn)


@router.patch("/transactions/{transaction_id}/category", response_model=TransactionResponse)
async def update_category(
    transaction_id: UUID,
    body: UpdateCategoryRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> TransactionResponse:
    account = await _get_or_create_account(db, current_user)
    txn = await repo.get_transaction(db, transaction_id, account.id)
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    txn = await repo.update_transaction_category(db, txn, body.category)
    await db.commit()
    await db.refresh(txn)
    return TransactionResponse.model_validate(txn)


# ── Virtual Card ──────────────────────────────────────────────────────────────

@router.get("/accounts/me/card", response_model=VirtualCardResponse)
async def get_card(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> VirtualCardResponse:
    account = await _get_or_create_account(db, current_user)
    card = await repo.get_card(db, account.id)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No card found")
    return VirtualCardResponse.model_validate(card)


@router.post("/accounts/me/card/freeze", response_model=VirtualCardResponse)
async def freeze_card(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> VirtualCardResponse:
    account = await _get_or_create_account(db, current_user)
    card = await repo.get_card(db, account.id)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No card found")
    if card.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot freeze a cancelled card")
    card = await repo.set_card_status(db, card, "frozen")
    await db.commit()
    await db.refresh(card)
    return VirtualCardResponse.model_validate(card)


@router.post("/accounts/me/card/unfreeze", response_model=VirtualCardResponse)
async def unfreeze_card(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> VirtualCardResponse:
    account = await _get_or_create_account(db, current_user)
    card = await repo.get_card(db, account.id)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No card found")
    if card.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot unfreeze a cancelled card")
    card = await repo.set_card_status(db, card, "active")
    await db.commit()
    await db.refresh(card)
    return VirtualCardResponse.model_validate(card)
