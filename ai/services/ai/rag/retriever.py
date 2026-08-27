from dataclasses import dataclass

from ..providers.base import BaseProvider
from ..services.api_client import GoAPIClient


@dataclass
class RetrievalResult:
    id: str
    content: str
    context_type: str
    chunk_index: int
    similarity: float = 0.0


class Retriever:
    """Hybrid RAG retrieval.

    The retriever never touches the database. It produces the query embedding
    with the provider SDK, then delegates the vector+FTS search to the Go
    backend (which owns the pgvector store).
    """

    def __init__(
        self,
        provider: BaseProvider,
        api_client: GoAPIClient | None = None,
        vector_weight: float = 0.7,
    ):
        self._provider = provider
        self._api = api_client or GoAPIClient()
        self._vector_weight = vector_weight
        self._keyword_weight = 1.0 - vector_weight

    async def search(
        self,
        query: str,
        project_id: str,
        top_k: int = 5,
        similarity_threshold: float = 0.7,
    ) -> list[RetrievalResult]:
        query_embedding = await self._provider.embed(query)
        payload = await self._api.rag_search(
            query_embedding=query_embedding,
            project_id=project_id,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
        )

        results: list[RetrievalResult] = []
        for r in payload.get("results", []):
            results.append(RetrievalResult(
                id=r.get("id", ""),
                content=r.get("content", ""),
                context_type=r.get("context_type", ""),
                chunk_index=r.get("chunk_index", 0),
                similarity=r.get("similarity", 0.0),
            ))
        return results
