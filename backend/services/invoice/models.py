from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.models.base import Base, AuditMixin, TimestampMixin


class InvoiceSequence(Base):
    """Atomic sequential numbering per company per year."""
    __tablename__ = "invoice_sequences"
    __table_args__ = (UniqueConstraint("company_id", "year"),)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    last_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Invoice(Base, AuditMixin):
    __tablename__ = "invoices"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    invoice_number: Mapped[str] = mapped_column(Text, nullable=False)
    client_name: Mapped[str] = mapped_column(Text, nullable=False)
    client_email: Mapped[str] = mapped_column(Text, nullable=False)
    client_address: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    line_items: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    vat_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="GBP")
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    events: Mapped[list["InvoiceEvent"]] = relationship(
        "InvoiceEvent", back_populates="invoice", order_by="InvoiceEvent.created_at"
    )


class InvoiceEvent(Base):
    __tablename__ = "invoice_events"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    invoice_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    event_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="events")
