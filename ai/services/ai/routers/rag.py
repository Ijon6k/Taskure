"""RAG router — semantic search with pgvector"""
import json
import os
import uuid
from typing import Literal

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from ..clients import get_db_session, get_openai_client
from ..config import settings

log = structlog.get_logger()
router = APIRouter()


class UpsertContextRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=20000)
    project_id: str
    context_type: Literal["project", "label", "time_block", "routine"] = "project"
    metadata: dict | None = None


class SearchContextRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
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
    try:
        client = get_openai_client()
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        response = await client.embeddings.create(
            model=settings.openai_embedding_model,
            input=req.content,
        )
        raw_embedding = response.data[0].embedding
        # Format as string vector literal for PostgreSQL pgvector
        vector_str = f"[{','.join(str(x) for x in raw_embedding)}]"
    except Exception as e:
        log.error("rag.embedding_failed", error=str(e))
        raise HTTPException(500, "Embedding generation failed")

    async with await get_db_session() as session:
        chunk_index = 0
        total_chunks = 1
        new_id = str(uuid.uuid4())
        new_public_id = f"ctx_{uuid.uuid4().hex[:12]}"

        query = text("""
            INSERT INTO project_contexts
                (id, public_id, content, chunk_index, total_chunks, context_type, project_id, metadata, embedding, created_at, updated_at)
            VALUES
                (:id, :public_id, :content, :chunk_index, :total_chunks, :context_type, :project_id, :metadata::jsonb, :embedding::vector, NOW(), NOW())
            RETURNING id
        """)

        try:
            result = await session.execute(query, {
                "id": new_id,
                "public_id": new_public_id,
                "content": req.content,
                "chunk_index": chunk_index,
                "total_chunks": total_chunks,
                "context_type": req.context_type,
                "project_id": req.project_id,
                "metadata": json.dumps(req.metadata or {}),
                "embedding": vector_str,
            })
            await session.commit()
            row = await result.fetchone()
            if not row:
                raise HTTPException(500, "Failed to insert context record")
            return {"id": str(row[0]), "chunk_index": chunk_index, "total_chunks": total_chunks}
        except Exception as e:
            await session.rollback()
            log.error("rag.db_insert_failed", error=str(e))
            raise HTTPException(500, "Failed to persist project context")


@router.post("/search")
async def search_context(req: SearchContextRequest):
    """Semantic search over project context using cosine similarity"""
    try:
        client = get_openai_client()
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        response = await client.embeddings.create(
            model=settings.openai_embedding_model,
            input=req.query,
        )
        raw_embedding = response.data[0].embedding
        vector_str = f"[{','.join(str(x) for x in raw_embedding)}]"
    except Exception as e:
        log.error("rag.query_embedding_failed", error=str(e))
        raise HTTPException(500, "Embedding generation failed")

    async with await get_db_session() as session:
        query = text("""
            SELECT id, content, context_type, chunk_index,
                   1 - (embedding <=> :query_embedding::vector) AS similarity
            FROM project_contexts
            WHERE project_id = :project_id
            ORDER BY embedding <=> :query_embedding::vector
            LIMIT :top_k
        """)

        try:
            result = await session.execute(query, {
                "query_embedding": vector_str,
                "project_id": req.project_id,
                "top_k": req.top_k,
            })
            rows = await result.fetchall()
        except Exception as e:
            log.error("rag.search_query_failed", error=str(e))
            raise HTTPException(500, "Database search failed")

        results = []
        for row in rows:
            similarity = float(row[4]) if len(row) > 4 and row[4] is not None else 0.0
            if similarity >= req.similarity_threshold:
                results.append(ContextRecord(
                    id=str(row[0]),
                    content=row[1],
                    context_type=row[2],
                    chunk_index=row[3],
                    similarity=round(similarity, 4),
                ))

        return {"results": results, "total": len(results)}
