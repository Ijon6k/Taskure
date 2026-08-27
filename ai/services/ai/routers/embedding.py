from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import settings
from ..providers.base import ProviderConfig
from ..providers.openai import OpenAIProvider

router = APIRouter()


class EmbedRequest(BaseModel):
    text: str = Field(..., max_length=8000)
    model: str | None = None
    api_key: str | None = None
    endpoint: str | None = None


class EmbedResponse(BaseModel):
    embedding: list[float]
    model: str


def _build_provider(req: EmbedRequest) -> OpenAIProvider:
    api_key = req.api_key or settings.openai_api_key
    if not api_key:
        raise HTTPException(400, "OpenAI API key required for embeddings")

    config = ProviderConfig(
        api_key=api_key,
        endpoint=req.endpoint or settings.openai_endpoint or None,
        model=req.model or settings.openai_embedding_model,
    )
    return OpenAIProvider(config)


@router.post("/generate", response_model=EmbedResponse)
async def generate_embedding(req: EmbedRequest):
    try:
        provider = _build_provider(req)
        embedding = await provider.embed(req.text, model=req.model or settings.openai_embedding_model)
        return EmbedResponse(
            embedding=embedding,
            model=req.model or settings.openai_embedding_model,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, "Embedding generation failed") from exc
