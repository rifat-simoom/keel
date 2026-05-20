"""TrueLayer Data API client — sandbox and production."""
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from shared.config import settings

# ── URL bases ─────────────────────────────────────────────────────────────────

def _auth_base() -> str:
    return "https://auth.truelayer-sandbox.com" if settings.truelayer_sandbox else "https://auth.truelayer.com"

def _api_base() -> str:
    return "https://api.truelayer-sandbox.com" if settings.truelayer_sandbox else "https://api.truelayer.com"


# ── OAuth ─────────────────────────────────────────────────────────────────────

def build_connect_url(state: str) -> str:
    """Return the TrueLayer Connect URL to redirect the user to."""
    base = _auth_base()
    scopes = "info accounts balance transactions offline_access"
    params = (
        f"response_type=code"
        f"&client_id={settings.truelayer_client_id}"
        f"&scope={scopes.replace(' ', '%20')}"
        f"&redirect_uri={settings.truelayer_redirect_uri}"
        f"&state={state}"
    )
    # In sandbox, restrict to mock provider so users aren't shown real banks
    if settings.truelayer_sandbox:
        params += "&providers=mock"
    return f"{base}/?{params}"


async def exchange_code(code: str) -> dict[str, Any]:
    """Exchange an authorisation code for access + refresh tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{_auth_base()}/connect/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.truelayer_client_id,
                "client_secret": settings.truelayer_client_secret,
                "redirect_uri": settings.truelayer_redirect_uri,
                "code": code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
    resp.raise_for_status()
    payload = resp.json()
    # Normalise: attach computed expiry datetime
    expires_in = payload.get("expires_in", 3600)
    payload["expiry"] = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    return payload


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    """Get a new access token using the refresh token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{_auth_base()}/connect/token",
            data={
                "grant_type": "refresh_token",
                "client_id": settings.truelayer_client_id,
                "client_secret": settings.truelayer_client_secret,
                "refresh_token": refresh_token,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
    resp.raise_for_status()
    payload = resp.json()
    expires_in = payload.get("expires_in", 3600)
    payload["expiry"] = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    return payload


# ── Data API ──────────────────────────────────────────────────────────────────

async def _get(path: str, access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{_api_base()}{path}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
    resp.raise_for_status()
    return resp.json()


async def get_accounts(access_token: str) -> list[dict[str, Any]]:
    data = await _get("/data/v1/accounts", access_token)
    return data.get("results", [])


async def get_balance(access_token: str, account_id: str) -> dict[str, Any]:
    data = await _get(f"/data/v1/accounts/{account_id}/balance", access_token)
    results = data.get("results", [])
    if not results:
        raise ValueError("No balance data returned from TrueLayer")
    return results[0]


async def get_transactions(
    access_token: str,
    account_id: str,
    from_date: date,
    to_date: date,
) -> list[dict[str, Any]]:
    from_str = from_date.strftime("%Y-%m-%dT00:00:00")
    to_str = to_date.strftime("%Y-%m-%dT23:59:59")
    data = await _get(
        f"/data/v1/accounts/{account_id}/transactions?from={from_str}&to={to_str}",
        access_token,
    )
    return data.get("results", [])


# ── Category mapping ──────────────────────────────────────────────────────────

# Maps TrueLayer transaction_category → Keel HMRC category.
# Most land in OTHER so the user manually categorises them — this is intentional.
_CATEGORY_MAP: dict[str, str] = {
    "PURCHASE": "OTHER",
    "DIRECT_DEBIT": "OTHER",
    "STANDING_ORDER": "OTHER",
    "TRANSFER": "OTHER",
    "BILL_PAYMENT": "OTHER",
    "FEE_CHARGE": "BANK_CHARGES",
    "INTEREST": "OTHER",
    "CREDIT": "OTHER",
    "DEBIT": "OTHER",
    "ATM": "OTHER",
    "CASH": "OTHER",
    "CASHBACK": "OTHER",
    "DIVIDEND": "OTHER",
    "CHEQUE": "OTHER",
    "CORRECTION": "OTHER",
    "UNKNOWN": "OTHER",
}

def map_category(truelayer_category: str) -> str:
    return _CATEGORY_MAP.get(truelayer_category.upper(), "OTHER")
