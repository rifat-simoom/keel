import logging

import aio_pika

from .definitions import DomainEvent

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "keel.events"


class EventPublisher:
    def __init__(self, connection: aio_pika.abc.AbstractRobustConnection) -> None:
        self._connection = connection
        self._channel: aio_pika.abc.AbstractChannel | None = None
        self._exchange: aio_pika.abc.AbstractExchange | None = None

    async def start(self) -> None:
        self._channel = await self._connection.channel()
        self._exchange = await self._channel.declare_exchange(
            EXCHANGE_NAME,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )
        logger.info("EventPublisher connected to RabbitMQ exchange '%s'", EXCHANGE_NAME)

    async def publish(self, event: DomainEvent) -> None:
        if self._exchange is None:
            raise RuntimeError("EventPublisher.start() must be called first")

        body = event.model_dump_json().encode()
        message = aio_pika.Message(
            body=body,
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            message_id=str(event.id),
        )
        await self._exchange.publish(message, routing_key=event.event_type)
        logger.debug("Published event %s (id=%s)", event.event_type, event.id)

    async def close(self) -> None:
        if self._channel:
            await self._channel.close()
