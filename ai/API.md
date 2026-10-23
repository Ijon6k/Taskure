# AI Service — API Reference

Base URL: `http://localhost:5000`

## Health

```
GET /health
GET /hello
GET /api/ai/hello
```

Response: `{ "status": "ok", "service": "ai", "timestamp": "..." }`

---

## Chat

```
POST /api/ai/chat
```

Request:
```json
{
  "messages": [{"role": "user", "content": "Hello"}],
  "provider": "openai",
  "model": "gpt-4o-mini",
  "stream": true,
  "mode": "thinking",
  "api_key": "sk-...",
  "endpoint": "https://custom.api/v1"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `messages` | ChatMessage[] | Yes | `role`: user/assistant/system, `content`: string |
| `provider` | "openai" \| "anthropic" | No | Falls back to `AI_DEFAULT_PROVIDER` |
| `model` | string | No | Provider-specific default if omitted |
| `stream` | bool | No | Default `true` |
| `mode` | "fast" \| "thinking" | No | Default `"thinking"` |
| `api_key` | string | No | Overrides env var |
| `endpoint` | string | No | Custom provider endpoint |

When `stream: false`, returns JSON:
```json
{
  "content": "...",
  "provider": "gpt-4o",
  "model": "gpt-4o",
  "prompt_tokens": 150,
  "completion_tokens": 80
}
```

When `stream: true`, returns SSE:
```
event: message
data: token chunk

event: done
data: [DONE]
```

```
GET /api/ai/chat/providers
```

Response:
```json
{
  "providers": [
    {"id": "openai", "configured": true, "models": ["gpt-4o", "gpt-4o-mini"]},
    {"id": "anthropic", "configured": false, "models": ["claude-sonnet-4-20250514"]}
  ],
  "default": "anthropic"
}
```

---

## Embeddings

```
POST /api/ai/embedding/generate
```

Request:
```json
{
  "text": "Text to embed (max 8000 chars)",
  "model": "text-embedding-3-small",
  "api_key": "sk-...",
  "endpoint": "https://custom.api/v1"
}
```

Response:
```json
{
  "embedding": [0.123, -0.456, ...],
  "model": "text-embedding-3-small"
}
```

Embeddings always use OpenAI-compatible API (or custom endpoint).

---

## Operational Modes

All mode endpoints return SSE. All accept the same request shape:

```json
{
  "messages": [{"role": "user", "content": "..."}],
  "project_id": "abc123",
  "api_key": "sk-...",
  "model": "gpt-4o",
  "provider": "openai",
  "endpoint": "https://custom.api/v1"
}
```

| Field | Type | Required |
|-------|------|----------|
| `messages` | AIChatMessage[] | Yes |
| `project_id` | string | Yes |
| `api_key` | string | No |
| `model` | string | No |
| `provider` | "openai" \| "anthropic" | No |
| `endpoint` | string | No |

### Fast Mode

```
POST /api/ai/fast
```

No tools, no reflection, project memory only. ~500 token budget.

### Thinking Mode

```
POST /api/ai/thinking
```

Read-only tools, 1 reflection iteration. Context: project memory + journal + RAG. ~4000 token budget.

### Planning Mode

```
POST /api/ai/plan
```

Read+write tools (no destructive), 2 reflection iterations. Context: + tasks + columns. ~8000 token budget.

### Agent Mode

```
POST /api/ai/agent
```

All tools, 3 reflection iterations, HITL gate. Context: + notebook + discussion. ~16000 token budget.

### List Modes

```
GET /api/ai/modes
```

Response:
```json
{
  "modes": [
    {"id": "fast", "description": "No tools, no reflection...", "tools": "none"},
    {"id": "thinking", "description": "Read-only tools, 1 reflection...", "tools": "read_only"},
    {"id": "planning", "description": "Read+write tools...", "tools": "read_write_no_destructive"},
    {"id": "agent", "description": "All tools, 3 reflection...", "tools": "all"}
  ]
}
```

### SSE Event Stream

All mode endpoints emit these events:

| Event | Payload |
|-------|---------|
| `context_loaded` | `{workflow_id, mode, tokens_used, budget}` |
| `reflection_iteration` | `{workflow_id, iteration, max_iterations}` |
| `result` | `{workflow_id, content, tokens, [reflection_score], [iterations]}` |
| `error` | `{workflow_id, error}` |
| `done` | `[DONE]` |

---

## RAG

```
POST /api/ai/rag/index
POST /api/ai/rag/search
GET  /api/ai/rag/status
```
