from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import settings
from ..providers.base import ProviderConfig
from ..providers.openai import OpenAIProvider
from ..services.api_client import GoAPIClient
from ..services.chunker import chunk_text, hash_chunk

router = APIRouter()


class RAGRequest(BaseModel):
    query: str = Field(..., max_length=4000)
    project_id: str
    top_k: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    api_key: str | None = None
    endpoint: str | None = None


class RAGContextRequest(BaseModel):
    content: str
    project_id: str
    context_type: Literal["document", "project", "label", "time_block", "routine"] = "document"
    chunk_size: int = Field(default=1024, ge=256, le=4096)
    chunk_overlap: int = Field(default=128, ge=0, le=1024)
    api_key: str | None = None
    endpoint: str | None = None


class SearchResult(BaseModel):
    id: str
    content: str
    context_type: str
    chunk_index: int
    similarity: float


def _build_provider(api_key: str | None, endpoint: str | None) -> OpenAIProvider:
    key = api_key or settings.openai_api_key
    if not key:
        raise HTTPException(400, "OpenAI API key required for embeddings")

    config = ProviderConfig(
        api_key=key,
        endpoint=endpoint or settings.openai_endpoint or None,
    )
    return OpenAIProvider(config)


@router.post("/context")
async def upsert_context(req: RAGContextRequest):
    """Chunk + embed in the AI service, then persist via the Go backend.

    The AI service never writes to the database — storage goes through Go's
    /api/ai/index tool so the "all mutations via Go" invariant holds.
    """
    provider = _build_provider(req.api_key, req.endpoint)
    api = GoAPIClient()
    try:
        chunks = chunk_text(
            req.content,
            chunk_size=req.chunk_size,
            overlap=req.chunk_overlap,
        )
        payload_chunks = []
        for chunk in chunks:
            embedding = await provider.embed(chunk.content)
            payload_chunks.append({
                "content": chunk.content,
                "embedding": embedding,
                "metadata": {
                    "hash": hash_chunk(chunk.content),
                    "chunk_index": chunk.index,
                    "total_chunks": chunk.total,
                },
            })

        result = await api.index_chunks(
            source_type=req.context_type,
            source_id="rag-context",
            chunks=payload_chunks,
            project_id=req.project_id,
        )
        return {"chunk_count": len(chunks), **result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Indexing failed: {exc}") from exc
    finally:
        await api.close()


@router.post("/search")
async def search_context(req: RAGRequest):
    """Embed the query, then delegate vector search to the Go backend."""
    provider = _build_provider(req.api_key, req.endpoint)
    api = GoAPIClient()
    try:
        query_embedding = await provider.embed(req.query)
        payload = await api.rag_search(
            query_embedding=query_embedding,
            project_id=req.project_id,
            top_k=req.top_k,
            similarity_threshold=req.similarity_threshold,
        )
        return {
            "results": [
                SearchResult(
                    id=r.get("id", ""),
                    content=r.get("content", ""),
                    context_type=r.get("context_type", ""),
                    chunk_index=r.get("chunk_index", 0),
                    similarity=r.get("similarity", 0.0),
                )
                for r in payload.get("results", [])
            ],
            "total": payload.get("total", 0),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Search failed: {exc}") from exc
    finally:
        await api.close()
