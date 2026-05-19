import logging
import time
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from shared.config import settings

logger = logging.getLogger(__name__)
bearer = HTTPBearer()

JWKS_TTL_SECONDS = 86_400  # 24 hours — matches spec

_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0.0


class CurrentUser(BaseModel):
    sub: UUID
    email: str
    roles: list[str]
    company_id: UUID | None = None


async def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.monotonic()
    if _jwks_cache is None or (now - _jwks_fetched_at) > JWKS_TTL_SECONDS:
        jwks_url = (
            f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
            "/protocol/openid-connect/certs"
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(jwks_url)
            resp.raise_for_status()
            _jwks_cache = resp.json()
            _jwks_fetched_at = now
            logger.debug("JWKS refreshed from Keycloak")
    return _jwks_cache  # type: ignore[return-value]


async def _decode_token(token: str) -> dict:
    jwks = await _get_jwks()
    try:
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> CurrentUser:
    payload = await _decode_token(credentials.credentials)
    realm_access = payload.get("realm_access", {})
    roles: list[str] = realm_access.get("roles", [])
    return CurrentUser(
        sub=UUID(payload["sub"]),
        email=payload.get("email", ""),
        roles=roles,
    )


def require_role(role: str):
    async def _check(user: CurrentUser = Depends(require_auth)) -> CurrentUser:
        if role not in user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required",
            )
        return user

    return _check
