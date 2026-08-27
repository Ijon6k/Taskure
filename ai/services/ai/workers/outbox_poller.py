import asyncio
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

import structlog

from ..services.api_client import GoAPIClient

logger = structlog.get_logger(__name__)


@dataclass
class OutboxEvent:
    id: str
    aggregate_type: str
    aggregate_id: str
    event_type: str
    payload: dict[str, Any]


class OutboxPoller:
    """Polls the Go backend for unprocessed outbox events.

    The outbox_events table lives in the Go backend — the poller never touches
    the database directly. It asks Go for pending events, dispatches to handlers,
    then acks (processed) or reports failure (retry) back through Go.
    """

    def __init__(self, poll_interval: int = 5, max_retries: int = 3):
        self.poll_interval: int = poll_interval
        self.max_retries: int = max_retries
        self._handlers: dict[str, list[Callable[[OutboxEvent], Awaitable[None]]]] = {}
        self._running: bool = False
        self._api = GoAPIClient()

    def on(self, event_type: str):
        """Decorator to register a handler for an event type."""

        def decorator(fn):
            self._handlers.setdefault(event_type, []).append(fn)
            return fn

        return decorator

    async def start(self):
        """Start polling loop with adaptive backoff."""
        self._running = True
        consecutive_errors = 0
        try:
            while self._running:
                sleep_time = self.poll_interval
                try:
                    events = await self._api.poll_outbox(limit=50)
                    consecutive_errors = 0
                    for raw in events:
                        event = OutboxEvent(
                            id=raw.get("id", ""),
                            aggregate_type=raw.get("aggregate_type", ""),
                            aggregate_id=raw.get("aggregate_id", ""),
                            event_type=raw.get("event_type", ""),
                            payload=dict(raw.get("payload") or {}),
                        )
                        await self._dispatch(event)
                except Exception as exc:  # noqa: BLE001 — keep the loop alive
                    consecutive_errors += 1
                    sleep_time = min(self.poll_interval * (2 ** min(consecutive_errors, 3)), 30)
                    logger.warning("outbox_poll_failed", error=str(exc), next_retry_in=sleep_time)
                await asyncio.sleep(sleep_time)
        finally:
            await self._api.close()

    async def _dispatch(self, event: OutboxEvent):
        handlers = self._handlers.get(event.event_type, [])
        if not handlers:
            # No consumer registered → nothing to do; ack so it does not pile up.
            await self._safe_ack(event.id, True, "")
            return
        for handler in handlers:
            try:
                await handler(event)
                await self._safe_ack(event.id, True, "")
            except Exception as e:  # noqa: BLE001
                await self._safe_ack(event.id, False, str(e)[:500])

    async def _safe_ack(self, event_id: str, success: bool, error: str):
        try:
            await self._api.ack_outbox(event_id, success, error)
        except Exception as exc:  # noqa: BLE001
            logger.warning("outbox_ack_failed", event_id=event_id, error=str(exc))

    def stop(self):
        self._running = False
