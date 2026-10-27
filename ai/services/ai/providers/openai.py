import json
from collections.abc import AsyncIterator
from typing import Any

import openai
from tenacity import (
    AsyncRetrying,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

from ..types import Messages
from .base import BaseProvider, CompletionResult, ProviderConfig, ToolCall


def _is_retryable(exception: BaseException) -> bool:
    if isinstance(exception, openai.RateLimitError):
        return True
    if isinstance(exception, openai.APIConnectionError):
        return True
    if isinstance(exception, openai.InternalServerError):
        return True
    if isinstance(exception, openai.APITimeoutError):
        return True
    return False


_RETRY_DECORATOR = retry(
    retry=retry_if_exception(_is_retryable),
    wait=wait_exponential_jitter(initial=1, max=60, jitter=2),
    stop=stop_after_attempt(5),
    reraise=True,
)


class OpenAIProvider(BaseProvider):
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        client_kwargs: dict[str, Any] = {"api_key": config.api_key}
        if config.endpoint:
            client_kwargs["base_url"] = config.endpoint
        self._client: openai.AsyncOpenAI = openai.AsyncOpenAI(**client_kwargs)  # type: ignore[arg-type]

    def _build_kwargs(self, messages: Messages, kwargs: dict[str, Any]) -> dict[str, Any]:
        model = kwargs.get("model", self.config.model)
        temperature = kwargs.get("temperature", self.config.temperature)
        max_tokens = kwargs.get("max_tokens", self.config.max_tokens)
        top_p = kwargs.get("top_p", self.config.top_p)
        tools = self._tool_schemas(kwargs)
        create_kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
        }
        if tools:
            create_kwargs["tools"] = tools
        return create_kwargs

    @staticmethod
    def _parse_tool_calls(message) -> list[ToolCall] | None:
        raw_calls = getattr(message, "tool_calls", None)
        if not raw_calls:
            return None
        calls: list[ToolCall] = []
        for tc in raw_calls:
            fn = tc.function
            try:
                args = json.loads(fn.arguments or "{}")
            except json.JSONDecodeError:
                args = {"_raw": fn.arguments}
            calls.append(ToolCall(id=tc.id, name=fn.name, arguments=args))
        return calls

    async def complete(self, messages: Messages, **kwargs) -> CompletionResult:
        return await self._complete_impl(messages, **kwargs)

    @_RETRY_DECORATOR
    async def _complete_impl(self, messages: Messages, **kwargs) -> CompletionResult:
        create_kwargs = self._build_kwargs(messages, kwargs)

        response = await self._client.chat.completions.create(
            **create_kwargs, stream=False  # type: ignore[arg-type]
        )
        choice = response.choices[0]
        message = choice.message
        usage = response.usage
        return CompletionResult(
            content=message.content or "",
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
            tool_calls=self._parse_tool_calls(message),
        )

    async def stream(self, messages: Messages, **kwargs) -> AsyncIterator[str]:
        create_kwargs = self._build_kwargs(messages, kwargs)

        @_RETRY_DECORATOR
        async def _open_stream():
            return await self._client.chat.completions.create(
                **create_kwargs, stream=True  # type: ignore[arg-type]
            )

        stream = await _open_stream()
        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content

    async def embed(self, text: str, model: str | None = None) -> list[float]:
        return await self._embed_impl(text, model)

    @_RETRY_DECORATOR
    async def _embed_impl(self, text: str, model: str | None = None) -> list[float]:
        embed_model = model or "text-embedding-3-small"
        response = await self._client.embeddings.create(
            model=embed_model,
            input=text,
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        if not texts:
            return []
        return await self._embed_batch_impl(texts, model)

    @_RETRY_DECORATOR
    async def _embed_batch_impl(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        embed_model = model or "text-embedding-3-small"
        response = await self._client.embeddings.create(
            model=embed_model,
            input=texts,
        )
        return [item.embedding for item in response.data]

    async def test_connection(self) -> None:
        # models.list() validates key + endpoint with an unauthenticated-safe call.
        await self._client.models.list()
