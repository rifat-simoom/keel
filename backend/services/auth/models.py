from uuid import UUID, uuid4

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.models.base import Base, TimestampMixin


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    company_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    vat_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    utr: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Tax settings (Gap 1 — Phase 6 prerequisite)
    is_vat_registered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    vat_scheme: Mapped[str] = mapped_column(String(20), nullable=False, default="cash")     # cash | accrual
    vat_stagger: Mapped[str] = mapped_column(String(1), nullable=False, default="A")         # A | B | C
    year_end_month: Mapped[int] = mapped_column(Integer, nullable=False, default=3)           # 1–12
    payment_terms_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    invoice_footer: Mapped[str | None] = mapped_column(Text, nullable=True)

    users: Mapped[list["UserProfile"]] = relationship("UserProfile", back_populates="company")


class UserProfile(Base, TimestampMixin):
    __tablename__ = "user_profiles"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    keycloak_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="owner")

    company: Mapped[Company | None] = relationship("Company", back_populates="users")
