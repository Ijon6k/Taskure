# Kanban — Personal Project Workspace

A self-hosted kanban board for managing projects. Still in active development.

```bash
git clone https://github.com/Ijon6k/kanbanproject.git && cd kanban
docker compose up -d
# → http://localhost:9080
```

## What Works

- **Kanban board** — drag-and-drop columns & tasks, search/filter, inline create
- **Column management** — rename, reorder, color accent, duplicate, delete
- **Task management** — priority, labels, due dates, checklists
- **3 themes** — Dark (OLED), Dim (Discord-like), Light, with 5 accent colors
- **Self-hosted** — everything runs in Docker, no cloud dependency

## WIP / Planned

- **AI assistant** — streaming chat with project context (backend scaffolding exists, not wired)
- **RAG knowledge base** — upload docs for AI context (pgvector ready, pipeline not connected)
- **File attachments** — UI exists, MinIO backend not wired
- **Auth** — middleware exists but no real user accounts (single-user only)
- **Capture panel** — quick idea capture from board
- **Pomodoro timer**, JSON export/import, empty/error/loading states

## Quick Start

```bash
git clone https://github.com/Ijon6k/kanbanproject.git
cd kanban
docker compose up -d
```

Open **http://localhost:9080**. All 7 services start automatically.

To prepare for AI features (once wired), create `.env` with your API keys:

```bash
cp .env.example .env
# edit .env — add OPENAI_API_KEY and/or ANTHROPIC_API_KEY
```

### What's Included

| Service | Port | URL |
|---------|------|-----|
| Web (Next.js 15) | 9080 | http://localhost:9080 |
| API (Go + Gin) | internal | via nginx `/api/*` |
| AI (Python + FastAPI) | internal | via nginx `/ai/*` |
| PostgreSQL 16 + pgvector | internal | — |
| Redis 7 | internal | — |
| MinIO (S3 storage) | internal | — |
| nginx reverse proxy | 9080 | entry point |

## Development

```bash
# Run dependencies only
docker compose up -d postgres redis minio

# Frontend (requires Bun)
cd frontend && bun install && bun dev

# Backend (requires Go 1.24)
cd backend && go run ./cmd/server
```

## Tech Stack

**Frontend:** Next.js 15.5 + React 19 + Tailwind CSS v4 + @dnd-kit + React Query v5 + Zustand  
**Backend:** Go 1.24 + Gin + GORM (PostgreSQL)  
**AI (WIP):** Python 3.12 + FastAPI + OpenAI + Anthropic SDKs  
**Infra:** Docker Compose, nginx, MinIO, Redis

## License

MIT
