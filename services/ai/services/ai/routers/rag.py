"""RAG router — semantic search with pgvector"""
from typing import Literal

import openai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from ..config import settings

router = APIRouter()

_engine = None


async def get_engine():
    global _engine
    if _engine is None:
        _engine = create_async_engine(settings.database_url, pool_size=settings.postgres_pool_size)
    return _engine


async def get_session() -> AsyncSession:
    engine = await get_engine()
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return async_session()


class UpsertContextRequest(BaseModel):
    content: str
    project_id: str
    context_type: Literal["project", "label", "time_block", "routine"] = "project"
    metadata: dict | None = None


class SearchContextRequest(BaseModel):
    query: str = Field(..., max_length=4000)
    project_id: str
    top_k: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)


class ContextRecord(BaseModel):
    id: str
    content: str
    context_type: str
    chunk_index: int
    similarity: float | None = None


@router.post("/context")
async def upsert_context(req: UpsertContextRequest):
    """Store a context chunk with its embedding"""
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(400, "OpenAI API key required for embeddings")

    client = openai.OpenAI(api_key=api_key)

    try:
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=req.content,
        )
        embedding = response.data[0].embedding
    except Exception as e:
        raise HTTPException(500, f"Embedding failed: {str(e)}")

    async with await get_session() as session:
        # Simple chunking — 1 chunk for now (MVP)
        chunk_index = 0
        total_chunks = 1

        query = text("""
            INSERT INTO project_context
                (content, chunk_index, total_chunks, context_type, project_id, metadata, embedding, created_at, updated_at)
            VALUES
                (:content, :chunk_index, :total_chunks, :context_type, :project_id, :metadata, :embedding, NOW(), NOW())
            RETURNING id
        """)

        result = await session.execute(query, {
            "content": req.content,
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
            "context_type": req.context_type,
            "project_id": req.project_id,
            "metadata": str(req.metadata or {}),
            "embedding": embedding,
        })
        await session.commit()
        row = await result.fetchone()

        return {"id": row[0], "chunk_index": chunk_index, "total_chunks": total_chunks}


@router.post("/search")
async def search_context(req: SearchContextRequest):
    """Semantic search over project context using cosine similarity"""
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(400, "OpenAI API key required for embeddings")

    client = openai.OpenAI(api_key=api_key)

    # Generate query embedding
    try:
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=req.query,
        )
        query_embedding = response.data[0].embedding
    except Exception as e:
        raise HTTPException(500, f"Embedding failed: {str(e)}")

    async with await get_session() as session:
        # Use pgvector cosine distance for similarity search
        query = text("""
            SELECT id, content, context_type, chunk_index,
                   1 - (embedding <=> :query_embedding::vector) AS similarity
            FROM project_context
            WHERE project_id = :project_id
            ORDER BY embedding <=> :query_embedding::vector
            LIMIT :top_k
        """)

        result = await session.execute(query, {
            "query_embedding": query_embedding,
            "project_id": req.project_id,
            "top_k": req.top_k,
        })
        rows = await result.fetchall()

        results = []
        for row in rows:
            similarity = row[4] if len(row) > 4 else 0.0
            if similarity >= req.similarity_threshold:
                results.append(ContextRecord(
                    id=str(row[0]),
                    content=row[1],
                    context_type=row[2],
                    chunk_index=row[3],
                    similarity=float(similarity) if similarity else None,
                ))

        return {"results": results, "total": len(results)}
