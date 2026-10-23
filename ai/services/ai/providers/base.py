from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from ..types import Messages, ToolSchema


# When the AI service runs inside Docker, `localhost`/`127.0.0.1` in a provider
# endpoint points at the container, not the host. Other BYOK apps run on the
# host so `localhost` "just works" — we mirror that by rewriting to the Docker
# host gateway when it is resolvable.
_HOST_GATEWAY = "host.docker.internal"


def _resolve_host(url: str) -> str:
    if not url:
        return url
    lowered = url.lower()
    if "localhost" in lowered or "127.0.0.1" in lowered:
        try:
            import socket

            socket.gethostbyname(_HOST_GATEWAY)
        except OSError:
            # Not running inside Docker — keep localhost as-is.
            return url
        return url.replace("localhost", _HOST_GATEWAY).replace("127.0.0.1", _HOST_GATEWAY)
    return url


@dataclass
class ProviderConfig:
    api_key: str
    endpoint: str | None = None
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 1.0


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any] = field(default_factory=dict)


@dataclass
class CompletionResult:
    content: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    tool_calls: list[ToolCall] | None = None


class BaseProvider(ABC):
    def __init__(self, config: ProviderConfig):
        self.config = config
        # Rewrite localhost → host.docker.internal so BYOK endpoints that use
        # localhost (as every host-side app does) work from inside Docker.
        if self.config.endpoint:
            self.config.endpoint = _resolve_host(self.config.endpoint)

    @abstractmethod
    async def complete(self, messages: Messages, **kwargs) -> CompletionResult:
        """Complete a conversation. `tools` (optional) is a list of
        OpenAI-style function tool definitions; the provider adapts it to its
        native wire format and returns parsed tool_calls on CompletionResult.
        """
        ...

    @abstractmethod
    def stream(self, messages: Messages, **kwargs) -> AsyncIterator[str]:
        """Return an async iterator of text chunks. Implementations are async
        generators, so this is a sync abstract method returning the iterator.
        """
        raise NotImplementedError

    @abstractmethod
    async def embed(self, text: str, model: str | None = None) -> list[float]:
        ...

    @abstractmethod
    async def test_connection(self) -> None:
        """Raise on failure — used by the provider test endpoint."""
        ...

    @staticmethod
    def _tool_schemas(kwargs: dict[str, Any]) -> list[ToolSchema] | None:
        tools = kwargs.get("tools")
        return tools if tools else None
