from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class WorkflowState(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


@dataclass
class WorkflowStep:
    step: int
    name: str
    state: str = "pending"
    tool_calls: list[Any] = field(default_factory=list)
    reflection_score: int | None = None
    started_at: float = 0.0
    completed_at: float = 0.0


WorkflowRecord = dict[str, Any]


class WorkflowLifecycleManager:
    def __init__(self):
        self._workflows: dict[str, WorkflowRecord] = {}

    def create(self, project_id: str, mode: str) -> str:
        workflow_id = str(uuid.uuid4())
        self._workflows[workflow_id] = {
            "id": workflow_id,
            "project_id": project_id,
            "mode": mode,
            "state": WorkflowState.PENDING,
            "steps": [],
            "result": None,
            "error": None,
            "created_at": time.time(),
            "started_at": None,
            "completed_at": None,
        }
        return workflow_id

    def start(self, workflow_id: str):
        wf = self._workflows[workflow_id]
        wf["state"] = WorkflowState.RUNNING
        wf["started_at"] = time.time()

    def add_step(self, workflow_id: str, name: str) -> int:
        step_index = len(self._workflows[workflow_id]["steps"])
        step = WorkflowStep(step=step_index, name=name, started_at=time.time())
        self._workflows[workflow_id]["steps"].append(step)
        return step_index

    def complete_step(
        self, workflow_id: str, step_index: int, result: dict[str, Any] | None = None
    ):
        steps = self._workflows[workflow_id]["steps"]
        steps[step_index].state = "completed"
        steps[step_index].completed_at = time.time()
        if result and "reflection_score" in result:
            steps[step_index].reflection_score = result["reflection_score"]
        if result and "tool_calls" in result:
            steps[step_index].tool_calls = result["tool_calls"]

    def _set_state(self, workflow_id: str, state: WorkflowState):
        self._workflows[workflow_id]["state"] = state
        self._workflows[workflow_id]["completed_at"] = time.time()

    def complete(self, workflow_id: str):
        """Mark a workflow as completed."""
        self._set_state(workflow_id, WorkflowState.COMPLETED)

    def pause(self, workflow_id: str):
        self._workflows[workflow_id]["state"] = WorkflowState.PAUSED

    def resume(self, workflow_id: str):
        self._workflows[workflow_id]["state"] = WorkflowState.RUNNING

    def cancel(self, workflow_id: str):
        self._set_state(workflow_id, WorkflowState.CANCELLED)

    def fail(self, workflow_id: str, error: str):
        self._workflows[workflow_id]["error"] = error
        self._set_state(workflow_id, WorkflowState.FAILED)

    def timeout(self, workflow_id: str):
        self._set_state(workflow_id, WorkflowState.TIMED_OUT)

    def get(self, workflow_id: str) -> WorkflowRecord:
        return self._workflows.get(workflow_id, {})

    def get_history(self, workflow_id: str) -> list[dict[str, Any]]:
        wf = self._workflows.get(workflow_id)
        if not wf:
            return []
        return [
            {
                "step": s.step,
                "name": s.name,
                "state": s.state,
                "tool_calls": s.tool_calls,
                "reflection_score": s.reflection_score,
                "duration_ms": int((s.completed_at - s.started_at) * 1000),
            }
            for s in wf["steps"]
        ]
