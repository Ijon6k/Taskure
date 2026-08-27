import asyncio
import time
from enum import Enum


class ApprovalDecision(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"
    TIMED_OUT = "timed_out"


class HITLGate:
    def __init__(self, approval_timeout: int = 300):
        self._pending: dict[str, dict] = {}
        self._events: dict[str, asyncio.Event] = {}
        self._results: dict[str, dict] = {}
        self._timeout = approval_timeout

    async def request_approval(
        self,
        execution_id: str,
        tool_name: str,
        parameters: dict,
        risk_level: str,
        reasoning: str,
    ) -> ApprovalDecision:
        event = asyncio.Event()
        self._events[execution_id] = event
        self._pending[execution_id] = {
            "tool_name": tool_name,
            "parameters": parameters,
            "risk_level": risk_level,
            "reasoning": reasoning,
            "requested_at": time.time(),
        }

        try:
            await asyncio.wait_for(event.wait(), timeout=self._timeout)
        except asyncio.TimeoutError:
            self._pending.pop(execution_id, None)
            self._events.pop(execution_id, None)
            return ApprovalDecision.TIMED_OUT

        result = self._results.pop(execution_id, {})
        return result.get("decision", ApprovalDecision.TIMED_OUT)

    def submit(
        self,
        execution_id: str,
        decision: str,
        modified_params: dict | None = None,
    ):
        self._results[execution_id] = {
            "decision": ApprovalDecision(decision),
            "modified_params": modified_params,
        }
        event = self._events.get(execution_id)
        if event:
            event.set()
        self._pending.pop(execution_id, None)

    def get_pending(self) -> list[dict]:
        return [
            {"execution_id": eid, **details}
            for eid, details in self._pending.items()
        ]
