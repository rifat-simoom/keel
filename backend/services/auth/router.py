import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.middleware.auth import CurrentUser, require_auth

from .database import get_db
from . import repository as repo
from .schemas import RegisterRequest, UpdateProfileRequest, UserProfileResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """Called on first Keycloak login. Creates the user profile + company."""
    existing = await repo.get_user_by_keycloak_id(db, current_user.sub)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already registered")

    user = await repo.create_user_and_company(
        db,
        keycloak_id=current_user.sub,
        email=current_user.email,
        full_name=body.full_name,
        company_name=body.company_name,
        company_number=body.company_number,
        vat_number=body.vat_number,
        utr=body.utr,
    )
    await db.commit()
    return UserProfileResponse.model_validate(user)


@router.get("/me", response_model=UserProfileResponse)
async def get_me(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    user = await repo.get_user_by_keycloak_id(db, current_user.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found — call /register first",
        )
    return UserProfileResponse.model_validate(user)


@router.put("/me", response_model=UserProfileResponse)
async def update_me(
    body: UpdateProfileRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    user = await repo.get_user_by_keycloak_id(db, current_user.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    user = await repo.update_user_profile(
        db,
        user,
        full_name=body.full_name,
        company_name=body.company_name,
        company_number=body.company_number,
        vat_number=body.vat_number,
        utr=body.utr,
        is_vat_registered=body.is_vat_registered,
        vat_scheme=body.vat_scheme,
        vat_stagger=body.vat_stagger,
        year_end_month=body.year_end_month,
        payment_terms_days=body.payment_terms_days,
        invoice_footer=body.invoice_footer,
    )
    await db.commit()
    return UserProfileResponse.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    refresh_token: str,
    current_user: CurrentUser = Depends(require_auth),
) -> None:
    """Revoke the refresh token in Keycloak."""
    revoke_url = (
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
        "/protocol/openid-connect/revoke"
    )
    async with httpx.AsyncClient() as client:
        await client.post(
            revoke_url,
            data={
                "token": refresh_token,
                "token_type_hint": "refresh_token",
                "client_id": settings.keycloak_client_id,
                "client_secret": settings.keycloak_client_secret,
            },
        )
