from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import Company, UserProfile


async def get_user_by_keycloak_id(db: AsyncSession, keycloak_id: UUID) -> UserProfile | None:
    result = await db.execute(
        select(UserProfile)
        .options(selectinload(UserProfile.company))
        .where(UserProfile.keycloak_id == keycloak_id)
    )
    return result.scalar_one_or_none()


async def create_user_and_company(
    db: AsyncSession,
    keycloak_id: UUID,
    email: str,
    full_name: str,
    company_name: str,
    company_number: str | None = None,
    vat_number: str | None = None,
    utr: str | None = None,
) -> UserProfile:
    company = Company(
        name=company_name,
        company_number=company_number,
        vat_number=vat_number,
        utr=utr,
    )
    db.add(company)
    await db.flush()

    user = UserProfile(
        keycloak_id=keycloak_id,
        email=email,
        full_name=full_name,
        company_id=company.id,
        role="owner",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user, ["company"])
    return user


async def update_user_profile(
    db: AsyncSession,
    user: UserProfile,
    full_name: str | None = None,
    company_name: str | None = None,
    company_number: str | None = None,
    vat_number: str | None = None,
    **kwargs,
) -> UserProfile:
    if full_name is not None:
        user.full_name = full_name

    if user.company:
        if company_name:
            user.company.name = company_name
        if company_number is not None:
            user.company.company_number = company_number
        if vat_number is not None:
            user.company.vat_number = vat_number
        if kwargs.get("utr") is not None:
            user.company.utr = kwargs["utr"]
        if kwargs.get("is_vat_registered") is not None:
            user.company.is_vat_registered = kwargs["is_vat_registered"]
        if kwargs.get("vat_scheme") is not None:
            user.company.vat_scheme = kwargs["vat_scheme"]
        if kwargs.get("vat_stagger") is not None:
            user.company.vat_stagger = kwargs["vat_stagger"]
        if kwargs.get("year_end_month") is not None:
            user.company.year_end_month = kwargs["year_end_month"]
        if kwargs.get("payment_terms_days") is not None:
            user.company.payment_terms_days = kwargs["payment_terms_days"]
        if kwargs.get("invoice_footer") is not None:
            user.company.invoice_footer = kwargs["invoice_footer"]

    await db.flush()
    await db.refresh(user, ["company"])
    return user
