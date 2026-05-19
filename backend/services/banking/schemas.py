from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ── Account ───────────────────────────────────────────────────────────────────

class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    sort_code: str
    account_number: str
    balance: Decimal
    currency: str
    created_at: datetime


class AccountStatsResponse(BaseModel):
    period_days: int
    total_income: Decimal
    total_expenses: Decimal
    net: Decimal
    transaction_count: int


# ── Transaction ───────────────────────────────────────────────────────────────

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    amount: Decimal
    description: str
    category: str | None
    merchant_name: str | None
    transaction_date: date
    is_expense: bool
    invoice_id: UUID | None
    receipt_id: UUID | None
    created_at: datetime


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class CreateTransactionRequest(BaseModel):
    amount: Decimal
    description: str
    transaction_date: date
    category: str | None = None
    merchant_name: str | None = None
    is_expense: bool = False


class UpdateCategoryRequest(BaseModel):
    category: str


# ── Virtual Card ──────────────────────────────────────────────────────────────

class VirtualCardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    last_four: str
    expiry_month: int
    expiry_year: int
    status: str
    spending_limit: Decimal | None
    created_at: datetime
