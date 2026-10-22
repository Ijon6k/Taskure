"""Embedding router — generate text embeddings asynchronously"""
from typing import Literal

import numpy as np
import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..clients import get_openai_client
from ..config import settings

log = structlog.get_logger()
router = APIRouter()


class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    model: Literal["openai", "anthropic"] | None = None
    embedding_model: str | None = None


class EmbedResponse(BaseModel):
    embedding: list[float]
    model: str
    tokens_used: int | None = None


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_np = np.array(a, dtype=np.float32)
    b_np = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(a_np)
    norm_b = np.linalg.norm(b_np)
    denominator = max(float(norm_a * norm_b), 1e-9)
    return float(np.dot(a_np, b_np) / denominator)


@router.post("/generate", response_model=EmbedResponse)
async def generate_embedding(req: EmbedRequest):
    try:
        client = get_openai_client()
    except ValueError as e:
        raise HTTPException(400, str(e))

    model_name = req.embedding_model or settings.openai_embedding_model

    try:
        response = await client.embeddings.create(
            model=model_name,
            input=req.text,
        )
        return EmbedResponse(
            embedding=response.data[0].embedding,
            model=response.model,
            tokens_used=response.usage.total_tokens if hasattr(response.usage, "total_tokens") else None,
        )
    except Exception as e:
        log.error("embedding.generation_failed", error=str(e))
        raise HTTPException(500, "Embedding generation failed")
