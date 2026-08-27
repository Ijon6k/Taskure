from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..providers import build_provider, resolve_provider_config

router = APIRouter()


class ProviderTestRequest(BaseModel):
    provider: Literal["openai", "anthropic"]
    api_key: str | None = None
    endpoint: str | None = None
    model: str | None = None


@router.post("/test")
async def test_provider(req: ProviderTestRequest):
    """Validate a provider connection using the provider SDK (not raw HTTP).

    This is the single place where "test connection" lives — Go delegates here
    so provider protocol knowledge stays in the AI service.
    """
    try:
        config = resolve_provider_config(
            api_key=req.api_key,
            endpoint=req.endpoint,
            model=req.model,
            provider=req.provider,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    provider = build_provider(config)
    try:
        await provider.test_connection()
    except Exception as exc:
        raise HTTPException(400, f"Connection failed: {exc}") from exc

    return {"ok": True, "provider": req.provider, "model": config.model}
