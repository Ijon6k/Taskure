"""Indexing worker — processes outbox events to chunk, embed, and store document chunks via Go API."""

from ..config import settings
from ..providers.base import ProviderConfig
from ..providers.openai import OpenAIProvider
from ..services.api_client import GoAPIClient
from ..services.chunker import chunk_text, hash_chunk
from .outbox_poller import OutboxEvent, OutboxPoller


def _build_provider() -> OpenAIProvider:
    config = ProviderConfig(
        api_key=settings.openai_api_key,
        endpoint=settings.openai_endpoint or None,
    )
    return OpenAIProvider(config)


async def _index_content(content: str, project_id: str, context_type: str, source_id: str):
    if not settings.openai_api_key:
        return
    provider = _build_provider()
    chunks = chunk_text(content, chunk_size=settings.rag_chunk_size, overlap=settings.rag_chunk_overlap)
    if not chunks:
        return

    texts = [c.content for c in chunks]
    emb_vectors = await provider.embed_batch(texts)

    embeddings = []
    for chunk, emb in zip(chunks, emb_vectors):
        embeddings.append({
            "content": chunk.content,
            "embedding": emb,
            "metadata": {
                "hash": hash_chunk(chunk.content),
                "chunk_index": chunk.index,
                "total_chunks": chunk.total,
            },
        })

    api = GoAPIClient()
    try:
        await api.index_chunks(context_type, source_id, embeddings, project_id)
    finally:
        await api.close()


async def _handle_resource_uploaded(event: OutboxEvent):
    content = event.payload.get("content", "")
    project_id = event.payload.get("project_id", "")
    context_type = event.payload.get("context_type", "document")

    if not content or not project_id:
        return

    await _index_content(content, project_id, context_type, event.aggregate_id)


async def _handle_notebook_section_changed(event: OutboxEvent):
    content = event.payload.get("content", "")
    project_id = event.payload.get("project_id", "")

    if not content or not project_id:
        return

    await _index_content(content, project_id, "notebook", event.aggregate_id)


async def _handle_task_created(event: OutboxEvent):
    title = event.payload.get("title", "")
    description = event.payload.get("description", "")
    project_id = event.payload.get("project_id", "")

    content = f"Task: {title}\n{description}".strip()
    if not content or not project_id:
        return

    await _index_content(content, project_id, "task", event.aggregate_id)


def register(poller: OutboxPoller):
    poller.on("resource.uploaded")(_handle_resource_uploaded)
    poller.on("notebook.section_changed")(_handle_notebook_section_changed)
    poller.on("task.created")(_handle_task_created)
