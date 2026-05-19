from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class AddressSchema(BaseModel):
    line1: str
    line2: str | None = None
    city: str
    county: str | None = None
    postcode: str
    country: str = "GB"


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    company_number: str | None
    vat_number: str | None
    utr: str | None
    is_vat_registered: bool = False
    vat_scheme: str = "cash"
    vat_stagger: str = "A"
    year_end_month: int = 3
    payment_terms_days: int = 30
    invoice_footer: str | None = None
    created_at: datetime


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    keycloak_id: UUID
    email: str
    full_name: str | None
    company_id: UUID | None
    role: str
    created_at: datetime
    updated_at: datetime
    company: CompanyResponse | None = None


class RegisterRequest(BaseModel):
    company_name: str
    full_name: str
    company_number: str | None = None
    vat_number: str | None = None
    utr: str | None = None


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    company_name: str | None = None
    company_number: str | None = None
    vat_number: str | None = None
    utr: str | None = None
    is_vat_registered: bool | None = None
    vat_scheme: str | None = None
    vat_stagger: str | None = None
    year_end_month: int | None = None
    payment_terms_days: int | None = None
    invoice_footer: str | None = None
