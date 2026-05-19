from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    notification_type: str
    title: str
    body: str
    route: str | None
    payload: dict | None
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class RegisterDeviceRequest(BaseModel):
    token: str
    platform: str = "unknown"


class DeadlineResponse(BaseModel):
    deadline_type: str        # vat_return | corp_tax_payment | corp_tax_filing | self_assessment | invoice_due
    title: str
    description: str
    due_date: date
    days_until: int
    route: str
    urgency: str              # ok | warning | critical
