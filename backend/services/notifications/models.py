from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base


class Notification(Base):
    """In-app notification stored in DB and polled by the web/mobile client."""
    __tablename__ = "notifications"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    # notification_type: invoice_overdue | invoice_paid | invoice_viewed |
    #                    tax_deadline | document_matched | receipt_attention
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    route: Mapped[str | None] = mapped_column(Text, nullable=True)   # deep-link e.g. /invoices/{id}
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )


class DeviceToken(Base):
    """Expo push token for a company (mobile only)."""
    __tablename__ = "device_tokens"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    platform: Mapped[str] = mapped_column(String(10), nullable=False, default="unknown")  # ios | android
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
