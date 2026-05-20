from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

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
    # Populated when transaction is imported from TrueLayer; null for manual/seeded rows
    truelayer_transaction_id: Mapped[str | None] = mapped_column(Text, nullable=True, unique=True)
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


class BankConnection(Base, TimestampMixin):
    """Stores TrueLayer OAuth tokens for a connected bank account."""
    __tablename__ = "bank_connections"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, unique=True, index=True)
    # TrueLayer identifiers
    truelayer_account_id: Mapped[str] = mapped_column(Text, nullable=False)
    provider_id: Mapped[str] = mapped_column(Text, nullable=False, default="mock")
    provider_name: Mapped[str] = mapped_column(Text, nullable=False, default="Mock Bank")
    display_name: Mapped[str] = mapped_column(Text, nullable=False, default="Current Account")
    # Tokens (plaintext for sandbox — encrypt at rest before production)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    token_expiry: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Sync state
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active | expired | disconnected
