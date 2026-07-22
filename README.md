# Kanban — AI-powered Personal Project Workspace

A self-hosted, open-source kanban + project management workspace with built-in AI assistant, RAG knowledge base, and dual LLM provider support (OpenAI + Anthropic).

## Features

- **Workspace / Project / Board hierarchy** — multiple workspaces, each with multiple kanban projects
- **Tasks with rich metadata** — priority, status, due dates, checklists, labels, attachments
- **AI assistant** — OpenAI + Anthropic dual provider with streaming chat responses
- **RAG knowledge base** — pgvector semantic search across project context
- **Capture inbox** — quick notes that AI can triage into structured tasks
- **3-theme system** — Dark (OLED), Dim (default), Light
- **S3-compatible storage** — MinIO for attachments
- **Self-hosted** — single `docker compose up -d` to run everything

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15.5 + React 19 + TailwindCSS v4 + shadcn/ui |
| Backend | Go 1.24 + Gin framework + GORM |
| AI Service | Python 3.12 + FastAPI |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| Object Storage | MinIO (S3-compatible) |
| Reverse Proxy | nginx |
| Package Manager | Bun |

## Quick Start (Self-Hosted)

### Prerequisites
- Docker + Docker Compose
- 4GB+ RAM, 10GB+ disk

### Run it

```bash
# 1. Clone
git clone https://github.com/Ijon6k/kanbanproject.git
cd kanbanproject

# 2. (Optional) Configure environment
cp .env.example .env
# edit .env with your AI keys and secrets

# 3. Start everything
docker compose up -d

# 4. Open in browser
open http://localhost:9080
```

That's it. All 7 services (nginx, web, api, ai, postgres, redis, minio) start automatically.

### What runs where

| Service | Internal Port | Exposed Port | URL |
|---|---|---|---|
| nginx (entry) | 80 | 9080 | http://localhost:9080 |
| web (Next.js) | 3000 | (internal) | via nginx |
| api (Go) | 4000 | (internal) | via nginx `/api/*` |
| ai (FastAPI) | 5000 | (internal) | via nginx `/ai/*` |
| postgres | 5432 | (internal) | internal network only |
| redis | 6379 | (internal) | internal network only |
| minio | 9000/9001 | (internal) | internal network only |

### AI Configuration (Optional)

To enable AI features, add to `.env`:

```bash
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
```

The AI service supports both providers and falls back automatically. Embeddings use OpenAI's `text-embedding-3-small` by default.

### Stop / Reset

```bash
# Stop all services (keeps data)
docker compose down

# Stop and DELETE all data (fresh start)
docker compose down -v
```

## Development

### Local Development with Hot Reload

For active development with code reloading:

```bash
# Coming soon: docker-compose.dev.yml with hot-reload for all services
# In the meantime, you can run services individually:

# Run only the infra (postgres, redis, minio)
docker compose up -d postgres redis minio

# Run API locally (requires Go 1.24)
cd apps/api
go run ./cmd/server

# Run Web locally (requires Bun)
cd apps/web
bun install
bun dev

# Run AI locally (requires Python 3.12)
cd services/ai
pip install -r requirements.txt  # if you create one
uvicorn services.ai.main:app --reload
```

### Project Structure

```
kanbanproject/
├── apps/
│   ├── web/                # Next.js 15.5 frontend
│   │   ├── src/app/        # App Router pages
│   │   ├── src/components/ # React components
│   │   ├── src/hooks/      # Custom hooks
│   │   ├── src/lib/        # API client, utils
│   │   └── Dockerfile
│   └── api/                # Go 1.24 backend
│       ├── cmd/server/     # Entry point
│       ├── internal/
│       │   ├── config/     # Env-driven config
│       │   ├── db/         # GORM connection + AutoMigrate
│       │   ├── models/     # GORM domain models (13 entities)
│       │   └── middleware/ # Gin middleware (CORS, auth, etc)
│       ├── go.mod / go.sum
│       └── Dockerfile
├── services/
│   └── ai/                 # Python 3.12 FastAPI AI service
│       ├── services/ai/    # routers (chat, embedding, rag, health)
│       ├── pyproject.toml
│       └── Dockerfile
├── packages/
│   └── shared/             # TypeScript: shared types, Zod schemas
├── nginx/
│   └── default.conf        # Reverse proxy config
├── docker-compose.yml      # Self-host stack (root-level)
├── .env.example            # Environment template
└── README.md
```

## Roadmap

This is **Phase 0: Infrastructure** complete. The architecture is in place; subsequent phases build out features:

- **Phase 1**: Core workspace (auth, workspace/project CRUD, kanban board)
- **Phase 2**: Capture + context (inbox, attachments, RAG ingestion)
- **Phase 3**: AI integration (chat assistant, project RAG, smart capture)
- **Phase 4**: Productivity (time tracking, templates, automation)
- **Phase 5**: Polish (custom themes, export/import, mobile)

## Contributing

PRs welcome. Before opening a PR, please:

1. Fork the repo and create a feature branch from `dev`
2. Follow existing code style and conventions
3. Update internal docs (`docs-internal/`) — see `.agents/skills/kanban-project/SKILL.md`
4. Test locally before pushing
5. Open a PR against the `dev` branch

## License

MIT — see [LICENSE](./LICENSE)

## Acknowledgements

Built with [Next.js](https://nextjs.org), [Gin](https://gin-gonic.com), [GORM](https://gorm.io), [FastAPI](https://fastapi.tiangolo.com), and [PostgreSQL](https://postgresql.org).

---

**Status:** MVP infrastructure complete (Phase 0)
**Version:** 0.1.0
