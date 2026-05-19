from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from shared.models.base import Base, TimestampMixin


class Account(Base, TimestampMixin):
    __tablename__ = "accounts"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    sort_code: Mapped[str] = mapped_column(String(8), nullable=False, default="04-00-04")
    account_number: Mapped[str] = mapped_column(String(8), nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="GBP")

    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="account")
    cards: Mapped[list["VirtualCard"]] = relationship("VirtualCard", back_populates="account")


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(Text, nullable=True)
    merchant_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_expense: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    invoice_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    receipt_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    account: Mapped["Account"] = relationship("Account", back_populates="transactions")


class VirtualCard(Base, TimestampMixin):
    __tablename__ = "virtual_cards"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    last_four: Mapped[str] = mapped_column(String(4), nullable=False)
    expiry_month: Mapped[int] = mapped_column(Integer, nullable=False)
    expiry_year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    spending_limit: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    account: Mapped["Account"] = relationship("Account", back_populates="cards")
