from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from ..config import settings
from ..providers import build_provider, resolve_provider_config
from ..providers.base import ProviderConfig

router = APIRouter()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    provider: Literal["openai", "anthropic"] | None = None
    model: str | None = None
    stream: bool = True
    mode: Literal["fast", "thinking"] = "thinking"
    api_key: str | None = None
    endpoint: str | None = None


class ChatResponse(BaseModel):
    content: str
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int


def _resolve_provider_config(req: ChatRequest) -> ProviderConfig:
    provider_name = req.provider or settings.ai_default_provider

    if provider_name not in ("openai", "anthropic"):
        raise HTTPException(400, f"Unknown provider: {provider_name}")

    key = req.api_key or getattr(settings, f"{provider_name}_api_key", None)
    if not key:
        raise HTTPException(
            400,
            f"No API key configured for provider '{provider_name}'. "
            "Add it in Settings → AI Providers, or set the API key in the request body.",
        )

    max_tokens = settings.fast_max_tokens if req.mode == "fast" else settings.thinking_max_tokens

    return resolve_provider_config(
        api_key=req.api_key,
        endpoint=req.endpoint,
        model=req.model,
        provider=req.provider,
        max_tokens=max_tokens,
        temperature=settings.openai_temperature
        if provider_name == "openai"
        else settings.anthropic_temperature,
    )


def _build_sse_stream(stream_generator):
    async def event_generator():
        async for chunk in stream_generator:
            if chunk:
                yield {"event": "message", "data": chunk}
        yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(event_generator())


@router.post("")
async def chat(req: ChatRequest):
    config = _resolve_provider_config(req)
    provider = build_provider(config)

    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    if req.stream:
        stream_gen = provider.stream(messages)
        return _build_sse_stream(stream_gen)

    result = await provider.complete(messages)
    return ChatResponse(
        content=result.content,
        provider=req.provider or settings.ai_default_provider,
        model=config.model,
        prompt_tokens=result.prompt_tokens,
        completion_tokens=result.completion_tokens,
    )


@router.get("/providers")
async def list_providers():
    return {
        "providers": [
            {
                "id": "openai",
                "configured": bool(settings.openai_api_key),
                "models": [settings.openai_model, settings.openai_fast_model],
            },
            {
                "id": "anthropic",
                "configured": bool(settings.anthropic_api_key),
                "models": [settings.anthropic_model],
            },
        ],
        "default": settings.ai_default_provider,
    }
