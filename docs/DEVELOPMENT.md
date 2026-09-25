# Taskure Development Setup

## Prerequisites

- Docker / Podman + Compose (for Postgres, SeaweedFS and full-stack runs)
- Go 1.25+ (backend)
- Bun (frontend + dev scripts)
- Node.js (optional; Bun covers it)

## Quick Start (Docker, production-style)

```bash
docker compose up -d --build
```

Services (from `compose.yaml`):

| Service | Container | Port | Notes |
|---|---|---|---|
| nginx | `kanban-nginx` | **1106** (host) | single entry point |
| web | `kanban-web` | 3000 (internal) | Next.js production build |
| api | `kanban-api` | 4000 (internal) | Go API |
| ai | `kanban-ai` | 5000 (internal) | FastAPI (WIP) |
| postgres | `kanban-postgres` | 5432 (internal) | pgvector/pg16 |
| seaweedfs | `kanban-seaweedfs` | 9000 (internal) | S3-compatible object storage |

App: http://localhost:1106

## Local Development

### Option A — Dev launcher (recommended)

```bash
bun scripts/dev.ts
```

Interactive CLI: builds/launches containers from `compose.dev.yaml` profiles (web with hot reload, api with live mount, etc.).

### Option B — Bare metal backend + Docker data services

1. Start only the data layer:

```bash
docker compose -f compose.yaml -f compose.dev.yaml --profile services up -d
```

2. Run the API locally:

```bash
cd backend
cp .env.example .env   # adjust to your needs
go run ./cmd/server    # dev server :4000 (restart manually on change)
```

3. Run the web app locally:

```bash
cd frontend
bun install
bun run dev            # http://localhost:3000
```

> The API reads `.env` from its working directory (`godotenv`); defaults point at `localhost` Postgres/SeaweedFS with user `kanban` / `kanban` DB.

### SeaweedFS Filer console (optional)

http://localhost:8888 — file browser for SeaweedFS volume data.

## Environment Variables

Defined in `backend/internal/config/config.go`. Frontend reads `NEXT_PUBLIC_API_URL` (default `/api`).

| Variable | Default | Purpose |
|---|---|---|
| `APP_ENV` | `development` | release mode, error verbosity |
| `API_HOST` / `API_PORT` | `0.0.0.0` / `4000` | API listener |
| `JWT_SECRET` | dev placeholder | auth scaffolding |
| `API_CORS_ORIGINS` | `http://localhost:3000,http://localhost:8080` | allowed origins |
| `POSTGRES_HOST/PORT/USER/PASSWORD/DB` | `localhost/5432/kanban/changeme/kanban` | Postgres DSN |
| `S3_ENDPOINT` (or `MINIO_ENDPOINT`) | `seaweedfs:9000` | SeaweedFS S3 API |
| `S3_ACCESS_KEY/SECRET_KEY` | `seaweedadmin` | S3 credentials |
| `S3_BUCKET` | `kanban-uploads` | default bucket |
| `S3_PUBLIC_URL` | `/storage/kanban-uploads` | public serving prefix |
| `S3_USE_SSL` | `false` | TLS toggle |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | empty | AI service (WIP) |
| `VARIANT_WORKERS` | `2` | image worker concurrency |

## Common Commands

```bash
# Backend
cd backend
go build ./...
go vet ./...
go test ./...
gofmt -l internal/ cmd/          # formatting check (must be empty)
go run ./cmd/server              # dev server :4000

# Frontend
cd frontend
bun install
bun run dev                      # dev server :3000
bun run typecheck                # tsc --noEmit
bun run build                    # production build
```

## Testing & Verification

- **Backend**: `go test ./...` — unit tests live next to their source (`*_test.go`). Notable: focus engine, viewmodels, import validation.
- **Frontend**: `bun run typecheck` gates CI-style confidence; `bun run build` verifies the production bundle.
- **Smoke-test an endpoint**:

```bash
curl -s http://localhost:1106/health
curl -s "http://localhost:4000/api/projects/summary"
```

## Code Conventions

- **Commit style**: Conventional Commits (`feat:`, `fix:`, `perf:`, `docs:`, `refactor:`); one logical change per commit.
- **Backend layering**: handlers → services → repositories (see `docs/ARCHITECTURE.md`). Services own business rules; repositories own queries; handlers stay thin.
- **Doc comments**: Go — `// FuncName ...` on every exported func; TS — JSDoc `/** ... */` on every exported hook/service/helper, stating the *why* (e.g. cache invalidation side effects).
- **Frontend data flow**: mutations patch the board cache (`task-cache.ts`) and invalidate light queries — never refetch `/board` on a mutation.
- **Payloads**: add a viewmodel per page/surface; keep the board heavy only where needed.

## Database Access

```bash
docker exec -it kanban-postgres psql -U kanban -d kanban
```

See [DATABASE.md](./DATABASE.md) for the schema and manual-migration pattern.

## Related Docs

- [Architecture](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Database Schema](./DATABASE.md)
