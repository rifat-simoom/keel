"""TrueLayer connect/disconnect endpoints."""
import secrets
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.middleware.auth import CurrentUser, require_auth
from .database import get_db
from . import repository as repo
from . import truelayer as tl
from .schemas import (
    BankConnectionStatusResponse,
    ConnectUrlResponse,
    ExchangeCodeRequest,
    SyncResultResponse,
)

logger = logging.getLogger(__name__)
connect_router = APIRouter(prefix="/api/v1/banking", tags=["banking-connect"])


@connect_router.get("/connect/url", response_model=ConnectUrlResponse)
async def get_connect_url(
    current_user: CurrentUser = Depends(require_auth),
) -> ConnectUrlResponse:
    """Return the TrueLayer Connect URL to redirect the user to."""
    state = secrets.token_urlsafe(16)
    url = tl.build_connect_url(state)
    return ConnectUrlResponse(url=url, state=state)


@connect_router.post("/connect/exchange", response_model=BankConnectionStatusResponse)
async def exchange_code(
    body: ExchangeCodeRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> BankConnectionStatusResponse:
    """Exchange TrueLayer authorisation code for tokens, then sync account data."""
    company_id = await repo.get_company_id_for_user(db, current_user.sub)
    if not company_id:
        raise HTTPException(status_code=404, detail="Complete onboarding first")

    # Exchange code for tokens
    try:
        tokens = await tl.exchange_code(body.code)
    except Exception as exc:
        logger.error("TrueLayer code exchange failed: %s", exc)
        raise HTTPException(status_code=400, detail="Failed to exchange authorisation code with TrueLayer")

    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    token_expiry: datetime = tokens["expiry"]

    # Get the user's accounts from TrueLayer
    try:
        accounts = await tl.get_accounts(access_token)
    except Exception as exc:
        logger.error("TrueLayer get_accounts failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to retrieve accounts from TrueLayer")

    if not accounts:
        raise HTTPException(status_code=422, detail="No accounts found on the connected bank")

    # Pick the first current/transaction account (prefer TRANSACTION or BUSINESS_TRANSACTION)
    preferred_types = {"TRANSACTION", "BUSINESS_TRANSACTION"}
    chosen = next((a for a in accounts if a.get("account_type") in preferred_types), accounts[0])

    tl_account_id = chosen["account_id"]
    provider = chosen.get("provider", {})
    account_number = chosen.get("account_number", {})

    # Save connection
    conn = await repo.save_bank_connection(
        db=db,
        company_id=company_id,
        truelayer_account_id=tl_account_id,
        provider_id=provider.get("provider_id", "unknown"),
        provider_name=provider.get("display_name", "Your Bank"),
        display_name=chosen.get("display_name", "Current Account"),
        access_token=access_token,
        refresh_token=refresh_token,
        token_expiry=token_expiry,
    )

    # Update our account record with TrueLayer sort code / account number if available
    account = await repo.get_or_create_account(db, company_id)
    sort_code_raw = account_number.get("sort_code", "")
    if sort_code_raw:
        # TrueLayer returns sort code without dashes, e.g. "040004" → "04-00-04"
        sc = sort_code_raw.replace("-", "")
        if len(sc) == 6:
            account.sort_code = f"{sc[:2]}-{sc[2:4]}-{sc[4:]}"
    acct_num = account_number.get("number", "")
    if acct_num:
        account.account_number = acct_num

    await db.flush()

    # Do initial sync
    new_txns = await repo.sync_from_truelayer(db, account, conn)
    await db.commit()

    return BankConnectionStatusResponse(
        connected=True,
        provider_name=conn.provider_name,
        display_name=conn.display_name,
        last_synced_at=conn.last_synced_at,
        status=conn.status,
        new_transactions=new_txns,
    )


@connect_router.get("/connect/status", response_model=BankConnectionStatusResponse)
async def get_connection_status(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> BankConnectionStatusResponse:
    """Return whether the company has an active TrueLayer connection."""
    company_id = await repo.get_company_id_for_user(db, current_user.sub)
    if not company_id:
        raise HTTPException(status_code=404, detail="Complete onboarding first")
    conn = await repo.get_bank_connection(db, company_id)
    if not conn:
        return BankConnectionStatusResponse(connected=False)
    return BankConnectionStatusResponse(
        connected=True,
        provider_name=conn.provider_name,
        display_name=conn.display_name,
        last_synced_at=conn.last_synced_at,
        status=conn.status,
    )


@connect_router.post("/sync", response_model=SyncResultResponse)
async def manual_sync(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> SyncResultResponse:
    """Pull latest transactions from TrueLayer now."""
    company_id = await repo.get_company_id_for_user(db, current_user.sub)
    if not company_id:
        raise HTTPException(status_code=404, detail="Complete onboarding first")
    conn = await repo.get_bank_connection(db, company_id)
    if not conn:
        raise HTTPException(status_code=400, detail="No bank connected — connect your bank first")
    account = await repo.get_or_create_account(db, company_id)
    try:
        new_txns = await repo.sync_from_truelayer(db, account, conn)
    except Exception as exc:
        logger.error("Manual sync failed: %s", exc)
        raise HTTPException(status_code=502, detail="Sync failed — TrueLayer may be temporarily unavailable")
    await db.commit()
    return SyncResultResponse(new_transactions=new_txns, synced_at=conn.last_synced_at)


@connect_router.delete("/connect", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_bank(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Disconnect the TrueLayer connection (tokens are wiped from DB)."""
    company_id = await repo.get_company_id_for_user(db, current_user.sub)
    if not company_id:
        raise HTTPException(status_code=404, detail="Complete onboarding first")
    await repo.disconnect_bank(db, company_id)
    await db.commit()
