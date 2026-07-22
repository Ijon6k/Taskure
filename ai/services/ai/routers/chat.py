"""Chat router — dual LLM provider (OpenAI + Anthropic)"""
import os
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

import anthropic
import openai

from ..config import settings

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=4000)
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
    client = openai.OpenAI(api_key=settings.openai_api_key or os.getenv("OPENAI_API_KEY"))

    def generate():
        response = client.chat.completions.create(
            model=model or settings.openai_model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            stream=True,
            temperature=settings.openai_temperature,
            max_tokens=settings.openai_max_tokens,
        )
        for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield {"event": "message", "data": delta}
        yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(generate())


async def chat_anthropic(messages: list[ChatMessage], model: str, stream: bool = True):
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY"))

    system_msg = "You are an AI assistant in a personal project workspace called Kanban. Be helpful, concise, and context-aware."

    def generate():
        with client.messages.stream(
            model=model or settings.anthropic_model,
            max_tokens=settings.anthropic_max_tokens,
            temperature=settings.anthropic_temperature,
            system=system_msg,
            messages=[{"role": m.role, "content": m.content} for m in messages if m.role != "system"],
        ) as stream:
            for text in stream.text_stream:
                yield {"event": "message", "data": text}
            yield {"event": "done", "data": "[DONE]"}

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
