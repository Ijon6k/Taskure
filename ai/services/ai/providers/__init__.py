from .anthropic import AnthropicProvider
from .base import BaseProvider, CompletionResult, ProviderConfig
from .openai import OpenAIProvider


def resolve_provider_config(
    api_key: str | None = None,
    endpoint: str | None = None,
    model: str | None = None,
    provider: str | None = None,
    **extra,
) -> ProviderConfig:
    """Resolve provider configuration from explicit params and settings fallbacks."""
    from ..config import settings

    provider_name = provider or settings.ai_default_provider

    if provider_name == "openai":
        key = api_key or settings.openai_api_key
        ep = endpoint or settings.openai_endpoint or None
        m = model or settings.openai_model
    elif provider_name == "anthropic":
        key = api_key or settings.anthropic_api_key
        ep = endpoint or settings.anthropic_endpoint or None
        m = model or settings.anthropic_model
    else:
        raise ValueError(f"Unknown provider: {provider_name}")

    if not key:
        raise ValueError(f"No API key configured for provider: {provider_name}")

    return ProviderConfig(api_key=key, endpoint=ep, model=m, **extra)


def build_provider(config: ProviderConfig) -> BaseProvider:
    if "claude" in config.model or "anthropic" in (config.endpoint or ""):
        return AnthropicProvider(config)
    return OpenAIProvider(config)


__all__ = [
    "BaseProvider", "CompletionResult", "ProviderConfig",
    "OpenAIProvider", "AnthropicProvider",
    "resolve_provider_config", "build_provider",
]
