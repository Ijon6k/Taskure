# AI Service — Development Guide

## Setup

```bash
cd ai
uv sync
uv run python -c "from services.ai.main import app; print('OK')"
```

Copy `.env.example` to `.env` and fill in provider API keys.

## Running

```bash
uv run uvicorn services.ai.main:app --reload --port 5000
```

The server starts on `0.0.0.0:5000` with OpenAPI docs at `/docs` and `/redoc`.

## Provider Configuration

Set these environment variables (or pass per-request via `api_key` and `endpoint` fields):

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_ENDPOINT` | Custom endpoint (OpenRouter, Ollama, etc.) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ANTHROPIC_ENDPOINT` | Custom Anthropic-compatible endpoint |
| `AI_DEFAULT_PROVIDER` | `openai` or `anthropic` (default: `anthropic`) |

Per-request overrides: `api_key`, `model`, `provider`, and `endpoint` fields in request bodies take precedence over env vars.

## Testing

```bash
uv run pytest
```

## Code Style

Ruff is configured with `line-length=100`, Python 3.12 target. Enabled rules: E, F, I (isort), N (pep8-naming), W. Line length warnings suppressed (E501).

Conventions:
- Functions under 20 lines
- Single responsibility per module
- Type hints everywhere
- No verbose comments — code should be self-documenting
- Dataclasses for structured data (`ProviderConfig`, `CompletionResult`, `ContextSource`, etc.)
- Pydantic models for request/response schemas

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `fastapi` + `uvicorn[standard]` | Web framework + ASGI server |
| `openai` / `anthropic` | LLM provider SDKs |
| `tiktoken` | Token counting for context budget management |
| `tenacity` | Retry logic for LLM calls |
| `sqlalchemy[asyncio]` + `asyncpg` + `pgvector[async]` | PostgreSQL with vector extension |
| `sse-starlette` | Server-Sent Events for streaming responses |
| `httpx` | Async HTTP client for Go backend communication |
| `numpy` | Vector math for embedding operations |
| `structlog` | Structured logging |
| `PyPDF2` / `python-docx` | Document parsing |
| `pydantic` + `pydantic-settings` | Validation and settings management |
