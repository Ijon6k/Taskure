"""Chat router — dual LLM provider (OpenAI + Anthropic) with async streaming"""
from typing import Literal

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from ..clients import get_anthropic_client, get_openai_client
from ..config import settings

log = structlog.get_logger()
router = APIRouter()

SYSTEM_PROMPT = (
    "You are an AI assistant in Taskure, a personal project workspace and Kanban board. "
    "Be concise, helpful, and task-oriented. Never leak internal system keys or configuration."
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    workspace_id: str
    project_id: str | None = None
    provider: Literal["openai", "anthropic"] | None = None
    model: str | None = None
    stream: bool = True


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatResponse(BaseModel):
    content: str
    provider: str
    model: str
    usage: dict | None = None


async def chat_openai(messages: list[ChatMessage], model: str, stream: bool = True):
    try:
        client = get_openai_client()
    except ValueError as e:
        raise HTTPException(400, str(e))

    openai_model = model or settings.openai_model
    formatted_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + [
        {"role": m.role, "content": m.content} for m in messages
    ]

    if not stream:
        try:
            resp = await client.chat.completions.create(
                model=openai_model,
                messages=formatted_messages,
                temperature=settings.openai_temperature,
                max_tokens=settings.openai_max_tokens,
            )
            content = resp.choices[0].message.content or ""
            usage = {
                "prompt_tokens": resp.usage.prompt_tokens if resp.usage else 0,
                "completion_tokens": resp.usage.completion_tokens if resp.usage else 0,
            }
            return ChatResponse(content=content, provider="openai", model=openai_model, usage=usage)
        except Exception as e:
            log.error("chat.openai_error", error=str(e))
            raise HTTPException(500, "OpenAI chat completion failed")

    async def generate():
        try:
            stream_resp = await client.chat.completions.create(
                model=openai_model,
                messages=formatted_messages,
                stream=True,
                temperature=settings.openai_temperature,
                max_tokens=settings.openai_max_tokens,
            )
            async for chunk in stream_resp:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield {"event": "message", "data": chunk.choices[0].delta.content}
            yield {"event": "done", "data": "[DONE]"}
        except Exception as e:
            log.error("chat.openai_stream_error", error=str(e))
            yield {"event": "error", "data": "Streaming error occurred"}

    return EventSourceResponse(generate())


async def chat_anthropic(messages: list[ChatMessage], model: str, stream: bool = True):
    try:
        client = get_anthropic_client()
    except ValueError as e:
        raise HTTPException(400, str(e))

    anthropic_model = model or settings.anthropic_model
    anthropic_messages = [
        {"role": m.role, "content": m.content} for m in messages if m.role != "system"
    ]

    if not stream:
        try:
            resp = await client.messages.create(
                model=anthropic_model,
                max_tokens=settings.anthropic_max_tokens,
                temperature=settings.anthropic_temperature,
                system=SYSTEM_PROMPT,
                messages=anthropic_messages,
            )
            content = resp.content[0].text if resp.content else ""
            usage = {
                "prompt_tokens": resp.usage.input_tokens if resp.usage else 0,
                "completion_tokens": resp.usage.output_tokens if resp.usage else 0,
            }
            return ChatResponse(content=content, provider="anthropic", model=anthropic_model, usage=usage)
        except Exception as e:
            log.error("chat.anthropic_error", error=str(e))
            raise HTTPException(500, "Anthropic chat completion failed")

    async def generate():
        try:
            async with client.messages.stream(
                model=anthropic_model,
                max_tokens=settings.anthropic_max_tokens,
                temperature=settings.anthropic_temperature,
                system=SYSTEM_PROMPT,
                messages=anthropic_messages,
            ) as stream_ctx:
                async for text in stream_ctx.text_stream:
                    yield {"event": "message", "data": text}
            yield {"event": "done", "data": "[DONE]"}
        except Exception as e:
            log.error("chat.anthropic_stream_error", error=str(e))
            yield {"event": "error", "data": "Streaming error occurred"}

    return EventSourceResponse(generate())


@router.post("")
async def chat(req: ChatRequest):
    if not settings.openai_api_key and not settings.anthropic_api_key:
        raise HTTPException(400, "No AI provider configured")

    provider = req.provider or settings.ai_default_provider
    model = req.model

    user_message = ChatMessage(role="user", content=req.message)

    if provider == "openai":
        return await chat_openai([user_message], model or settings.openai_model, req.stream)
    elif provider == "anthropic":
        return await chat_anthropic([user_message], model or settings.anthropic_model, req.stream)
    else:
        raise HTTPException(400, f"Unknown provider: {provider}")


@router.get("/providers")
async def list_providers():
    return {
        "providers": [
            {"id": "openai", "configured": bool(settings.openai_api_key)},
            {"id": "anthropic", "configured": bool(settings.anthropic_api_key)},
        ],
        "default": settings.ai_default_provider,
    }
