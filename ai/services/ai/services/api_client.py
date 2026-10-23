import os
from typing import Any, final

import httpx
import structlog

GO_API_URL = os.getenv("GO_API_URL", "http://api:4000")

logger = structlog.get_logger(__name__)


@final
class GoAPIClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or GO_API_URL).rstrip("/")
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0, base_url=self.base_url)
        return self._client

    async def execute_tool(self, tool: str, params: dict[str, Any], project_id: str) -> dict[str, Any]:
        try:
            client = await self._get_client()
            resp = await client.post(
                "/api/ai/tools/execute",
                json={"tool": tool, "parameters": params, "project_id": project_id},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("go_api_tool_failed", tool=tool, project_id=project_id, error=str(exc))
            raise

    async def get_project_memory(self, project_id: str) -> dict[str, Any]:
        try:
            client = await self._get_client()
            resp = await client.get(f"/api/projects/{project_id}/memory")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("go_api_get_memory_failed", project_id=project_id, error=str(exc))
            raise

    async def get_recent_journal(self, project_id: str, limit: int = 10) -> list[dict[str, Any]]:
        try:
            client = await self._get_client()
            resp = await client.get(
                f"/api/projects/{project_id}/journal", params={"limit": limit},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("go_api_get_journal_failed", project_id=project_id, error=str(exc))
            raise

    async def get_project_tasks(self, project_id: str) -> list[dict[str, Any]]:
        try:
            client = await self._get_client()
            resp = await client.get(f"/api/projects/{project_id}/tasks")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("go_api_get_tasks_failed", project_id=project_id, error=str(exc))
            raise

    async def get_project_columns(self, project_id: str) -> list[dict[str, Any]]:
        try:
            client = await self._get_client()
            resp = await client.get(f"/api/projects/{project_id}/columns")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("go_api_get_columns_failed", project_id=project_id, error=str(exc))
            raise

    async def get_project_notebook(self, project_id: str, limit: int = 10) -> list[dict[str, Any]]:
        try:
            client = await self._get_client()
            resp = await client.get(
                f"/api/projects/{project_id}/notebook", params={"limit": limit},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("go_api_get_notebook_failed", project_id=project_id, error=str(exc))
            raise

    async def get_project_discussions(self, project_id: str, limit: int = 10) -> list[dict[str, Any]]:
        try:
            client = await self._get_client()
            resp = await client.get(
                f"/api/projects/{project_id}/discussions", params={"limit": limit},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("go_api_get_discussions_failed", project_id=project_id, error=str(exc))
            raise

    async def get_project_context(self, project_id: str) -> dict[str, Any]:
        try:
            client = await self._get_client()
            resp = await client.get(f"/api/projects/{project_id}/ai-context")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("go_api_get_context_failed", project_id=project_id, error=str(exc))
            raise

    async def index_chunks(self, source_type: str, source_id: str, chunks: list[dict[str, Any]], project_id: str) -> dict[str, Any]:
        return await self.execute_tool("index", {
            "source_type": source_type,
            "source_id": source_id,
            "chunks": chunks,
        }, project_id)

    async def rag_search(
        self,
        query_embedding: list[float],
        project_id: str,
        top_k: int = 5,
        similarity_threshold: float = 0.7,
    ) -> dict[str, Any]:
        """Vector search delegated to Go (Go owns the pgvector store)."""
        try:
            client = await self._get_client()
            resp = await client.post(
                "/api/ai/rag/search",
                json={
                    "project_id": project_id,
                    "embedding": query_embedding,
                    "top_k": top_k,
                    "similarity_threshold": similarity_threshold,
                },
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("go_api_rag_search_failed", project_id=project_id, error=str(exc))
            raise

    async def poll_outbox(self, limit: int = 50) -> list[dict[str, Any]]:
        try:
            client = await self._get_client()
            resp = await client.get("/api/ai/outbox/pending", params={"limit": limit})
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("go_api_poll_outbox_failed", error=str(exc))
            raise

    async def ack_outbox(self, event_id: str, success: bool, error: str = "") -> None:
        try:
            client = await self._get_client()
            resp = await client.post(
                f"/api/ai/outbox/{event_id}/ack",
                json={"success": success, "error": error},
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error("go_api_ack_outbox_failed", event_id=event_id, error=str(exc))
            raise

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
