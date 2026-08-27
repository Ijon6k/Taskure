from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from ..config import settings
from ..orchestrator.orchestrator import Orchestrator
from ..providers import resolve_provider_config

router = APIRouter()


class AIChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ModeRequest(BaseModel):
    messages: list[AIChatMessage] = Field(min_length=1)
    project_id: str
    api_key: str | None = None
    model: str | None = None
    provider: Literal["openai", "anthropic"] | None = None
    endpoint: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None


def _build_provider_config(req: ModeRequest):
    provider_name = req.provider or settings.ai_default_provider

    if provider_name not in ("openai", "anthropic"):
        raise HTTPException(400, f"Unknown provider: {provider_name}")

    if not (req.api_key or getattr(settings, f"{provider_name}_api_key", None)):
        raise HTTPException(400, f"No API key configured for provider: {provider_name}")

    extra: dict[str, Any] = {}
    if req.temperature is not None:
        extra["temperature"] = req.temperature
    if req.max_tokens is not None:
        extra["max_tokens"] = req.max_tokens
    if req.top_p is not None:
        extra["top_p"] = req.top_p

    return resolve_provider_config(
        api_key=req.api_key,
        endpoint=req.endpoint,
        model=req.model,
        provider=req.provider,
        **extra,
    )


async def _run_mode(mode: str, req: ModeRequest):
    config = _build_provider_config(req)
    orchestrator = Orchestrator()
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    async def event_generator():
        async for event in orchestrator.run(
            mode=mode,
            messages=messages,
            project_id=req.project_id,
            provider_config=config,
        ):
            yield event
        yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(event_generator())


@router.post("/fast")
async def fast_mode(req: ModeRequest):
    return await _run_mode("fast", req)


@router.post("/thinking")
async def thinking_mode(req: ModeRequest):
    return await _run_mode("thinking", req)


@router.post("/plan")
@router.post("/planning")
async def planning_mode(req: ModeRequest):
    return await _run_mode("planning", req)


@router.post("/agent")
async def agent_mode(req: ModeRequest):
    return await _run_mode("agent", req)


@router.get("/context-budget")
async def context_budget(project_id: str):
    """Minimal context-budget report; Go's GetContextBudget proxies here."""
    budget = settings.thinking_max_tokens if project_id else settings.fast_max_tokens
    return {
        "project_id": project_id,
        "total_window": budget,
        "used_tokens": 0,
        "remaining_tokens": budget,
        "breakdown": {"system": 0, "messages": 0, "tools": 0, "reasoning": 0},
    }


@router.get("/modes")
async def list_modes():
    return {
        "modes": [
            {
                "id": "fast",
                "description": "No tools, no reflection, project_memory only, ~500 token budget",
                "tools": "none",
            },
            {
                "id": "thinking",
                "description": "Read-only tools, 1 reflection iteration, project_memory + journal + RAG, ~4000 tokens",
                "tools": "read_only",
            },
            {
                "id": "planning",
                "description": "Read+write tools (no destructive), 2 reflection iterations, full context, ~8000 tokens",
                "tools": "read_write_no_destructive",
            },
            {
                "id": "agent",
                "description": "All tools, 3 reflection iterations, full context + working_memory + HITL, ~16000 tokens",
                "tools": "all",
            },
        ]
    }
