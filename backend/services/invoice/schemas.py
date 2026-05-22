from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AddressSchema(BaseModel):
    line1: str
    line2: str | None = None
    city: str
    county: str | None = None
    postcode: str
    country: str = "GB"


class LineItemSchema(BaseModel):
    description: str
    quantity: float
    unit_price: Decimal
    vat_rate: float  # 0 | 0.05 | 0.20


class InvoiceEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_type: str
    event_data: dict | None
    created_at: datetime


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    invoice_number: str
    client_name: str
    client_email: str
    client_address: dict | None
    line_items: list[dict]
    subtotal: Decimal
    vat_amount: Decimal
    total: Decimal
    currency: str
    issue_date: date
    due_date: date
    status: str
    paid_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    events: list[InvoiceEventResponse] = []


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class InvoiceStatsResponse(BaseModel):
    total_outstanding: Decimal
    total_overdue: Decimal
    overdue_count: int
    paid_this_month: Decimal
    draft_count: int


class CreateInvoiceRequest(BaseModel):
    client_name: str
    client_email: str
    client_address: AddressSchema | None = None
    line_items: list[LineItemSchema]
    issue_date: date
    due_date: date
    notes: str | None = None


class UpdateInvoiceRequest(BaseModel):
    client_name: str | None = None
    client_email: str | None = None
    client_address: AddressSchema | None = None
    line_items: list[LineItemSchema] | None = None
    issue_date: date | None = None
    due_date: date | None = None
    notes: str | None = None
