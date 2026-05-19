from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    file_key: str
    file_name: str
    mime_type: str
    file_size: int | None
    status: str
    vendor_name: str | None
    amount: Decimal | None
    vat_amount: Decimal | None
    expense_date: date | None
    category: str | None
    notes: str | None
    transaction_id: UUID | None
    created_at: datetime
    updated_at: datetime
    # presigned URL — injected by router, not from ORM
    url: str = ""


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class UpdateDocumentRequest(BaseModel):
    vendor_name: str | None = None
    amount: Decimal | None = None
    vat_amount: Decimal | None = None
    expense_date: date | None = None
    category: str | None = None
    notes: str | None = None


class MatchTransactionRequest(BaseModel):
    transaction_id: UUID
