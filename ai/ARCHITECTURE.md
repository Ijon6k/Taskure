# Taskure AI Service — Architecture

## Overview

The Python AI service is a reasoning engine — it plans, retrieves, reflects, and communicates with LLM providers. It never directly modifies business data; all mutations flow through the Go backend.

## Service Layout

```
ai/
├── services/ai/
│   ├── main.py                     # FastAPI app entry point
│   ├── config.py                   # Environment-based settings (pydantic-settings)
│   ├── providers/                  # LLM abstraction layer
│   │   ├── base.py                 # Abstract BaseProvider (complete, stream, embed)
│   │   ├── openai.py               # OpenAI-compatible adapter
│   │   └── anthropic.py            # Anthropic adapter
│   ├── routers/                    # HTTP endpoints
│   │   ├── health.py
│   │   ├── chat.py                 # Raw chat with optional stream/fast modes
│   │   ├── embedding.py            # Embedding generation (OpenAI only)
│   │   ├── ai_modes.py             # Mode-specific endpoints (fast/thinking/plan/agent)
│   │   └── rag.py
│   ├── services/                   # Core processing services
│   │   ├── chunker.py              # Recursive text chunking (tiktoken-aware)
│   │   ├── parser.py               # Document parsing (PDF, DOCX, MD, TXT)
│   │   ├── context_optimizer.py    # Dedup → Compress → Budget Fit → Assemble pipeline
│   │   ├── context_budget_manager.py # Token tracking + cost estimation
│   │   ├── memory_synthesizer.py   # LLM-driven memory evolution + journal synthesis
│   │   └── prompt_registry.py      # Versioned prompt templates with variable rendering
│   ├── rag/                        # RAG pipeline
│   │   ├── indexer.py              # Chunking + embedding + pgvector storage
│   │   └── retriever.py            # Hybrid search (vector + PostgreSQL FTS)
│   └── orchestrator/               # AI orchestration layer
│       ├── orchestrator.py         # Main coordinator (mode routing, context loading)
│       ├── workflow_lifecycle.py   # Execution state tracking (pending→running→completed/failed)
│       ├── tool_registry.py        # 27 domain-driven tool definitions with risk levels
│       ├── reflection_engine.py    # Plan → Generate → Evaluate → Improve cycle
│       ├── hitl_gate.py            # Human approval workflow (async event-based)
│       ├── telemetry_collector.py  # Per-workflow metrics (latency, tokens, cost)
│       └── planning_cache.py       # Reusable plan results with state-hash invalidation
├── pyproject.toml
├── Dockerfile
└── .env.example
```

## Key Architectural Decisions

### Provider Abstraction

Single `BaseProvider` ABC with three methods: `complete`, `stream`, `embed`. Two concrete adapters: `OpenAIProvider` and `AnthropicProvider`. Provider selection is automatic based on model name (detects "claude"/"anthropic" in model or endpoint) or explicit `provider` field in requests. Custom endpoints are supported for OpenRouter, Ollama, Groq, and any OpenAI-compatible API.

### AI Orchestrator

Internal layer (not a separate service) that coordinates context loading, mode routing, tool execution, reflection, and telemetry for each AI request. The orchestrator is instantiated per-request — it holds provider, prompt registry, retriever, lifecycle manager, tool registry, telemetry collector, HITL gate, and planning cache. Each request creates a workflow tracked by `WorkflowLifecycleManager` with state transitions: pending → running → completed/failed/cancelled/timed_out.

### Four Operational Modes

| Mode | Token Budget | Tools | Reflection | Context Sources | HITL |
|------|-------------|-------|------------|-----------------|------|
| Fast | 500 | None | 0 iterations | project_memory | No |
| Thinking | 4000 | Read-only | 1 iteration | project_memory, journal, rag | No |
| Planning | 8000 | Read+write (no destructive) | 2 iterations | + tasks, columns | No |
| Agent | 16000 | All | 3 iterations | + notebook, discussion | Yes |

### Context Optimization Pipeline

The `ContextOptimizer` runs a four-stage pipeline per request:

1. **Deduplication** — Sentence-level overlap detection (>50% overlap → drop lower-priority source)
2. **Compression** — Whitespace normalization, duplicate line removal
3. **Budget Fitting** — Greedy priority-based truncation (low-priority sources truncated first)
4. **Prompt Assembly** — Hierarchical concatenation in priority order: `[source_name]\ncontent`

Sources are loaded based on mode config and assembled into a single context block injected into the system message.

### Tool Registry

27 tools across 9 domains (Task, Project, Column, Notebook, Discussion, Journal, Memory, RAG, Plan). Each tool has a name, description, domain, JSON Schema parameters, required fields, and a risk level (LOW/MEDIUM/HIGH/CRITICAL). Read-only detection is suffix-based (`.search`, `.get`, `.get_recent`, etc.). Tools are filtered per mode — `fast` gets none, `thinking` gets read-only, `planning` excludes CRITICAL, `agent` gets all. Dual-format output: OpenAI function-calling and Anthropic tool-use schemas.

### Reflection Engine

For planning and agent modes: plan → generate per-step → merge → evaluate (0–100 score with gap identification) → improve (address gaps) → repeat. Terminates early if quality threshold is met. Falls back to a single "execute" step if LLM-based decomposition fails.

### Event-Driven Workers

No separate worker service. Internal orchestration uses:
- `MemorySynthesizer` for periodic memory evolution and journal synthesis
- `PlanningCache` with SHA-256 state-hash invalidation (24h TTL, per-project invalidation)
- `HITLGate` with async `asyncio.Event`-based approval flow (300s timeout)

### Streaming

All mode endpoints and chat use Server-Sent Events (SSE) via `sse-starlette`. Events are JSON: `{"event": "<type>", "data": "<json-string>"}`. No WebSockets.

## Data Flow

```
Request → Router → Orchestrator (mode routing)
        → ContextOptimizer (dedup → compress → budget → assemble)
        → Provider Adapter → LLM
        → Response stream (SSE)

Tool calls: Orchestrator → Tool Registry → Go Backend (HTTP) → Result → Orchestrator
```

## Architecture Invariants

- AI service never writes to business database directly — all mutations go through Go backend tool execution
- No separate microservices for orchestration or workers — everything runs in-process
- pgvector extension on PostgreSQL for vector storage — no dedicated vector DB
- SSE for streaming — no WebSockets
- Provider-agnostic at the orchestrator level — all LLM calls go through `BaseProvider`
- In-memory state for workflow tracking, telemetry, HITL, and planning cache — no Redis dependency at runtime (Redis config exists but is unused in current code)
