from uuid import UUID

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import DeviceToken, Notification


async def get_company_id_for_user(db: AsyncSession, keycloak_id: UUID) -> UUID | None:
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT company_id FROM user_profiles WHERE keycloak_id = :kid"),
        {"kid": str(keycloak_id)},
    )
    row = result.one_or_none()
    return UUID(str(row[0])) if row and row[0] else None


async def create_notification(
    db: AsyncSession,
    company_id: UUID,
    notification_type: str,
    title: str,
    body: str,
    route: str | None = None,
    payload: dict | None = None,
) -> Notification:
    n = Notification(
        company_id=company_id,
        notification_type=notification_type,
        title=title,
        body=body,
        route=route,
        payload=payload,
    )
    db.add(n)
    await db.flush()
    return n


async def list_notifications(
    db: AsyncSession,
    company_id: UUID,
    page: int = 1,
    page_size: int = 20,
    unread_only: bool = False,
) -> tuple[list[Notification], int, int]:
    filters = [Notification.company_id == company_id]
    if unread_only:
        filters.append(Notification.is_read.is_(False))

    total = (await db.execute(
        select(func.count()).select_from(Notification).where(and_(*filters))
    )).scalar() or 0

    unread = (await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.company_id == company_id,
            Notification.is_read.is_(False),
        )
    )).scalar() or 0

    result = await db.execute(
        select(Notification)
        .where(and_(*filters))
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), total, unread


async def mark_read(db: AsyncSession, notification_id: UUID, company_id: UUID) -> bool:
    result = await db.execute(
        update(Notification)
        .where(
            Notification.id == notification_id,
            Notification.company_id == company_id,
        )
        .values(is_read=True)
    )
    return result.rowcount > 0  # type: ignore[attr-defined]


async def mark_all_read(db: AsyncSession, company_id: UUID) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.company_id == company_id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    return result.rowcount  # type: ignore[attr-defined]


async def upsert_device_token(
    db: AsyncSession, company_id: UUID, token: str, platform: str
) -> DeviceToken:
    result = await db.execute(
        select(DeviceToken).where(DeviceToken.token == token)
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.company_id = company_id
        existing.platform = platform
        await db.flush()
        return existing
    dt = DeviceToken(company_id=company_id, token=token, platform=platform)
    db.add(dt)
    await db.flush()
    return dt
