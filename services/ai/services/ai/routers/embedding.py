"""Embedding router — generate text embeddings"""
import os
from typing import Literal

import numpy as np
import openai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import settings

router = APIRouter()


class EmbedRequest(BaseModel):
    text: str = Field(..., max_length=8000)
    model: Literal["openai", "anthropic"] | None = None
    embedding_model: str | None = None


class EmbedResponse(BaseModel):
    embedding: list[float]
    model: str
    tokens_used: int | None = None


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_np = np.array(a)
    b_np = np.array(b)
    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))


@router.post("/generate", response_model=EmbedResponse)
async def generate_embedding(req: EmbedRequest):
    if not settings.openai_api_key and not settings.anthropic_api_key:
        raise HTTPException(400, "No AI provider configured")

    # Use OpenAI for embeddings (best support for text-embedding-3)
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(400, "OpenAI API key required for embeddings")

    client = openai.OpenAI(api_key=api_key)

    try:
        response = client.embeddings.create(
            model=req.embedding_model or settings.openai_embedding_model,
            input=req.text,
        )
        return EmbedResponse(
            embedding=response.data[0].embedding,
            model=response.model,
            tokens_used=response.usage.total_tokens if hasattr(response.usage, "total_tokens") else None,
        )
    except Exception as e:
        raise HTTPException(500, f"Embedding generation failed: {str(e)}")
