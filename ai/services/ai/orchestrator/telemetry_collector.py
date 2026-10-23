import time
from dataclasses import dataclass, field


@dataclass
class TelemetryEvent:
    event_type: str
    latency_ms: int = 0
    tokens_used: int = 0
    cost_usd: float = 0.0
    metadata: dict = field(default_factory=dict)


class TelemetryCollector:
    def __init__(self):
        self._events: dict[str, list[TelemetryEvent]] = {}

    def start_span(self, workflow_id: str, event_type: str) -> float:
        return time.monotonic()

    def end_span(
        self,
        workflow_id: str,
        event_type: str,
        start_time: float,
        tokens: int = 0,
        metadata: dict | None = None,
    ):
        latency_ms = int((time.monotonic() - start_time) * 1000)
        event = TelemetryEvent(
            event_type=event_type,
            latency_ms=latency_ms,
            tokens_used=tokens,
            metadata=metadata or {},
        )
        self._events.setdefault(workflow_id, []).append(event)

    def get_events(self, workflow_id: str) -> list[TelemetryEvent]:
        return self._events.get(workflow_id, [])

    def get_summary(self) -> dict:
        total_events = sum(len(v) for v in self._events.values())
        if total_events == 0:
            return {"total_workflows": 0, "total_events": 0, "avg_latency_ms": 0, "total_tokens": 0}

        all_events = [e for events in self._events.values() for e in events]
        total_latency = sum(e.latency_ms for e in all_events)
        total_tokens = sum(e.tokens_used for e in all_events)
        return {
            "total_workflows": len(self._events),
            "total_events": total_events,
            "avg_latency_ms": total_latency // total_events,
            "total_tokens": total_tokens,
        }
