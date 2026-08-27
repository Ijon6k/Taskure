import json
from collections.abc import AsyncIterator
from typing import Any

import anthropic
from tenacity import (
    AsyncRetrying,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

from ..types import Messages, ToolSchema
from .base import BaseProvider, CompletionResult, ProviderConfig, ToolCall


def _is_retryable(exception: BaseException) -> bool:
    if isinstance(exception, anthropic.RateLimitError):
        return True
    if isinstance(exception, anthropic.APIConnectionError):
        return True
    if isinstance(exception, anthropic.InternalServerError):
        return True
    if isinstance(exception, anthropic.APITimeoutError):
        return True
    return False


_RETRY_DECORATOR = retry(
    retry=retry_if_exception(_is_retryable),
    wait=wait_exponential_jitter(initial=1, max=60, jitter=2),
    stop=stop_after_attempt(5),
    reraise=True,
)


def _split_system_messages(messages: Messages) -> tuple[str | None, Messages]:
    system_parts: list[str] = []
    non_system: Messages = []
    for msg in messages:
        if msg.get("role") == "system":
            content = msg.get("content", "")
            if isinstance(content, str):
                system_parts.append(content)
            elif isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        system_parts.append(str(block.get("text", "")))
        else:
            non_system.append(msg)
    system_text = "\n\n".join(system_parts) if system_parts else None
    return system_text, non_system


def _convert_tools(tools: list[ToolSchema]) -> list[ToolSchema]:
    """Convert OpenAI-style function tool definitions to Anthropic tool format."""
    converted: list[ToolSchema] = []
    for tool in tools:
        fn = tool.get("function", tool)
        converted.append({
            "name": fn.get("name", ""),
            "description": fn.get("description", ""),
            "input_schema": fn.get("parameters", {"type": "object", "properties": {}}),
        })
    return converted


def _build_anthropic_messages(messages: Messages) -> Messages:
    """Translate OpenAI-style messages (with tool_calls / tool roles) to Anthropic."""
    result: Messages = []
    pending_tool_results: list[ToolSchema] = []

    def flush_tool_results() -> None:
        nonlocal pending_tool_results
        if pending_tool_results:
            result.append({"role": "user", "content": pending_tool_results})
            pending_tool_results = []

    for msg in messages:
        role = msg.get("role")
        content = msg.get("content")

        if role == "assistant":
            flush_tool_results()
            tool_calls = msg.get("tool_calls")
            if tool_calls:
                blocks: list[ToolSchema] = []
                if content:
                    blocks.append({"type": "text", "text": content})
                for tc in tool_calls:  # type: ignore[union-attr]
                    # OpenAI wire format wraps tool calls in {"function": {...}}.
                    fn = tc.get("function", tc)
                    raw_args = fn.get("arguments", {})
                    if isinstance(raw_args, str):
                        try:
                            raw_args = json.loads(raw_args)
                        except json.JSONDecodeError:
                            raw_args = {}
                    blocks.append({
                        "type": "tool_use",
                        "id": str(tc.get("id", "")),
                        "name": str(fn.get("name", "")),
                        "input": raw_args,
                    })
                result.append({"role": "assistant", "content": blocks})
            else:
                result.append({"role": "assistant", "content": content or ""})

        elif role == "tool":
            pending_tool_results.append({
                "type": "tool_result",
                "tool_use_id": str(msg.get("tool_call_id", "")),
                "content": content if isinstance(content, str) else json.dumps(content),
            })

        elif role == "user":
            flush_tool_results()
            result.append({"role": "user", "content": content})

        else:  # system handled separately
            continue

    flush_tool_results()
    return result


class AnthropicProvider(BaseProvider):
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        client_kwargs: dict[str, Any] = {"api_key": config.api_key}
        if config.endpoint:
            client_kwargs["base_url"] = config.endpoint
        self._client: anthropic.AsyncAnthropic = anthropic.AsyncAnthropic(**client_kwargs)  # type: ignore[arg-type]

    def _build_kwargs(self, messages: Messages, kwargs: dict[str, Any]) -> dict[str, Any]:
        model = kwargs.get("model", self.config.model)
        temperature = kwargs.get("temperature", self.config.temperature)
        max_tokens = kwargs.get("max_tokens", self.config.max_tokens)
        top_p = kwargs.get("top_p", self.config.top_p)
        tools = self._tool_schemas(kwargs)

        system_text, conversation = _split_system_messages(messages)
        anthropic_messages = _build_anthropic_messages(conversation)

        create_kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
            "messages": anthropic_messages,
        }
        if system_text:
            create_kwargs["system"] = system_text
        if tools:
            create_kwargs["tools"] = _convert_tools(tools)
        return create_kwargs

    @staticmethod
    def _parse_tool_uses(content) -> list[ToolCall] | None:
        calls: list[ToolCall] = []
        for block in content:
            if getattr(block, "type", None) == "tool_use":
                calls.append(ToolCall(
                    id=block.id,
                    name=block.name,
                    arguments=dict(block.input or {}),
                ))
        return calls or None

    async def complete(self, messages: Messages, **kwargs) -> CompletionResult:
        return await self._complete_impl(messages, **kwargs)

    @_RETRY_DECORATOR
    async def _complete_impl(self, messages: Messages, **kwargs) -> CompletionResult:
        create_kwargs = self._build_kwargs(messages, kwargs)

        response = await self._client.messages.create(**create_kwargs)  # type: ignore[arg-type]
        text_blocks = [b.text for b in response.content if b.type == "text"]
        return CompletionResult(
            content="\n".join(text_blocks),
            prompt_tokens=response.usage.input_tokens or 0,
            completion_tokens=response.usage.output_tokens or 0,
            total_tokens=(response.usage.input_tokens or 0) + (response.usage.output_tokens or 0),
            tool_calls=self._parse_tool_uses(response.content),
        )

    async def stream(self, messages: Messages, **kwargs) -> AsyncIterator[str]:
        async for attempt in AsyncRetrying(
            wait=wait_exponential_jitter(initial=1, max=60, jitter=2),
            stop=stop_after_attempt(5),
            retry=retry_if_exception(_is_retryable),
        ):
            with attempt:
                async for chunk in self._stream_impl(messages, **kwargs):
                    yield chunk

    async def _stream_impl(self, messages: Messages, **kwargs) -> AsyncIterator[str]:
        create_kwargs = self._build_kwargs(messages, kwargs)

        async with self._client.messages.stream(**create_kwargs) as stream:  # type: ignore[arg-type]
            async for event in stream:
                if event.type == "content_block_delta" and event.delta.type == "text_delta":
                    yield event.delta.text

    async def embed(self, text: str, model: str | None = None) -> list[float]:
        raise NotImplementedError("Anthropic does not support embeddings")

    async def test_connection(self) -> None:
        # A minimal 1-token completion validates key + endpoint + model.
        await self._client.messages.create(
            model=self.config.model,
            max_tokens=1,
            messages=[{"role": "user", "content": "ping"}],
        )
