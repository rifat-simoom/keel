from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class EventType(StrEnum):
    # Invoice
    INVOICE_CREATED = "invoice.created"
    INVOICE_SENT = "invoice.sent"
    INVOICE_VIEWED = "invoice.viewed"
    INVOICE_PAID = "invoice.paid"
    INVOICE_OVERDUE = "invoice.overdue"

    # Transactions
    TRANSACTION_CREATED = "transaction.created"
    TRANSACTION_CATEGORISED = "transaction.categorised"

    # Documents
    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_PARSED = "document.parsed"
    DOCUMENT_MATCHED = "document.matched"
    DOCUMENT_ATTENTION_REQUIRED = "document.attention_required"

    # Payroll
    PAYROLL_RUN = "payroll.run"

    # Tax
    TAX_DEADLINE_APPROACHING = "tax.deadline_approaching"


class DomainEvent(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    event_type: EventType
    payload: dict[str, Any]
    company_id: UUID
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    schema_version: int = 1
