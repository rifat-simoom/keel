import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from shared.events.publisher import EventPublisher

from .models import OutboxEvent

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 2
BATCH_SIZE = 50


class OutboxWorker:
    """Polls the outbox table and publishes unpublished events to RabbitMQ.

    Guarantees at-least-once delivery. Consumers must be idempotent.
    """

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        publisher: EventPublisher,
    ) -> None:
        self._session_factory = session_factory
        self._publisher = publisher
        self._running = False

    async def start(self) -> None:
        self._running = True
        logger.info("OutboxWorker started (poll interval %ds)", POLL_INTERVAL_SECONDS)
        while self._running:
            try:
                await self._process_batch()
            except Exception:
                logger.exception("OutboxWorker error during batch processing")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

    async def stop(self) -> None:
        self._running = False
        logger.info("OutboxWorker stopped")

    async def _process_batch(self) -> None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(OutboxEvent)
                .where(OutboxEvent.published == False)  # noqa: E712
                .order_by(OutboxEvent.created_at)
                .limit(BATCH_SIZE)
                .with_for_update(skip_locked=True)
            )
            events = result.scalars().all()

            for event in events:
                try:
                    from shared.events.definitions import DomainEvent, EventType

                    domain_event = DomainEvent(
                        id=event.id,
                        event_type=EventType(event.event_type),
                        payload=event.payload,
                        company_id=event.company_id,
                    )
                    await self._publisher.publish(domain_event)

                    await session.execute(
                        update(OutboxEvent)
                        .where(OutboxEvent.id == event.id)
                        .values(published=True, published_at=datetime.now(UTC))
                    )
                    logger.debug("Published outbox event %s (%s)", event.id, event.event_type)
                except Exception:
                    logger.exception("Failed to publish outbox event %s", event.id)

            await session.commit()
