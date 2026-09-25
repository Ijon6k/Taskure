<div align="center">
  <img src="assets/taskurelogo2.webp" alt="Taskure" width="96" />
</div>

<div align="center">
  <a href="https://go.dev"><img src="https://img.shields.io/badge/Go-1.25-00ADD8?logo=go&logoColor=white" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js" /></a>
  <a href="https://www.docker.com"><img src="https://img.shields.io/badge/Docker_%26_Podman-ready-2496ED?logo=docker&logoColor=white" /></a>
  <a href="https://github.com/Ijon6k/Taskure/pkgs/container/taskure%2Fbackend"><img src="https://img.shields.io/badge/GHCR-Images-blue?logo=github" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" /></a>
</div>

<div align="center">
  <b>Taskure</b> — self-hosted personal workspace for Kanban, notes, and assets.
</div>

---

## Quick Start (Deploy via Pre-Built Images)

You can run Taskure instantly using Docker Compose or Podman Compose without compiling source code.

### 1. Create a `docker-compose.yml` file

```yaml
# ============================================================
# TASKURE — Production Docker & Podman Compose Stack
# ============================================================
services:
  nginx:
    image: ghcr.io/ijon6k/taskure/gateway:${IMAGE_TAG:-latest}
    container_name: taskure-nginx
    ports:
      - "${PORT_NGINX:-1106}:80"
    depends_on:
      - web
      - api
      - ai
    networks:
      - taskure-network
    restart: unless-stopped

  web:
    image: ghcr.io/ijon6k/taskure/frontend:${IMAGE_TAG:-latest}
    container_name: taskure-web
    expose:
      - "3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=/api
    depends_on:
      - api
    networks:
      - taskure-network
    restart: unless-stopped

  api:
    image: ghcr.io/ijon6k/taskure/backend:${IMAGE_TAG:-latest}
    container_name: taskure-api
    expose:
      - "4000"
    environment:
      - APP_ENV=production
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=${POSTGRES_USER:-kanban}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-changeme}
      - POSTGRES_DB=${POSTGRES_DB:-kanban}
      - S3_ENDPOINT=seaweedfs:9000
      - S3_ACCESS_KEY=${S3_ACCESS_KEY:-seaweedadmin}
      - S3_SECRET_KEY=${S3_SECRET_KEY:-seaweedadmin}
      - S3_BUCKET=${S3_BUCKET:-kanban-uploads}
      - S3_PUBLIC_URL=/storage/kanban-uploads
      - JWT_SECRET=${JWT_SECRET:-changeme-use-a-long-random-secret-min-32-chars}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
    depends_on:
      postgres:
        condition: service_healthy
      seaweedfs:
        condition: service_started
    networks:
      - taskure-network
    restart: unless-stopped

  ai:
    image: ghcr.io/ijon6k/taskure/ai:${IMAGE_TAG:-latest}
    container_name: taskure-ai
    expose:
      - "5000"
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=${POSTGRES_USER:-kanban}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-changeme}
      - POSTGRES_DB=${POSTGRES_DB:-kanban}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - taskure-network
    restart: unless-stopped

  postgres:
    image: docker.io/pgvector/pgvector:pg16
    container_name: taskure-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-kanban}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
      POSTGRES_DB: ${POSTGRES_DB:-kanban}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - taskure-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-kanban} -d ${POSTGRES_DB:-kanban}"]
      interval: 5s
      timeout: 5s
      retries: 5

  seaweedfs:
    image: docker.io/chrislusf/seaweedfs:latest
    container_name: taskure-seaweedfs
    command: "server -dir=/data -s3 -s3.port=9000"
    ports:
      - "${PORT_S3:-9000}:9000"
      - "${PORT_S3_FILER:-8888}:8888"
    volumes:
      - seaweedfs-data:/data
    networks:
      - taskure-network
    restart: unless-stopped

volumes:
  postgres-data:
  seaweedfs-data:

networks:
  taskure-network:
    driver: bridge
```

### 2. Launch the Stack

```bash
# Using Docker Compose
docker compose up -d

# Or using Podman Compose
podman-compose up -d

# Open in your browser:
# → http://localhost:1106
```

---

## Docker Image Versioning & Tagging

Taskure images are automatically built and published to GitHub Container Registry (**GHCR**) on every push via the GitHub Actions CI/CD pipeline:

- `ghcr.io/ijon6k/taskure/backend`
- `ghcr.io/ijon6k/taskure/frontend`
- `ghcr.io/ijon6k/taskure/ai`

### Tag Strategy

| Tag Type | Format / Example | Description | When to Use |
|:---|:---|:---|:---|
| **Latest** | `latest` | Automatically updated on every merge/push to `main` or release tag. Default fallback if `IMAGE_TAG` is unset. | Production & general self-hosting. |
| **Development** | `dev` | Updated on every commit pushed to the `dev` branch. Bleeding-edge features. | Testing preview features. |
| **Commit SHA** | `sha-5cbd0e7` | Short commit SHA tag generated on **every single commit** across all branches. | Pinning to an exact revision for reproducibility or rollbacks. |
| **SemVer Release** | `v0.1.0`, `0.1` | Published when a git tag matching `v*.*.*` is created. | Strict production releases. |

### Selecting an Image Version

Set the `IMAGE_TAG` variable in your `.env` file or pass it directly in the command line:

```bash
# 1. Default (latest stable build)
docker compose up -d

# 2. Bleeding-edge development build
IMAGE_TAG=dev docker compose up -d

# 3. Pin to a specific immutable commit
IMAGE_TAG=sha-5cbd0e7 docker compose up -d

# 4. Pin to a release version
IMAGE_TAG=v0.1.0 docker compose up -d
```

---

## Screenshots

| | | |
|:---:|:---:|:---:|
| ![Kanban](assets/preview/kanban.webp) | ![Notebook](assets/preview/notebook.webp) | ![Task](assets/preview/task.webp) |
| *Kanban board* | *Notebook editor* | *Task drawer* |
| ![Overview](assets/preview/overview.webp) | ![Settings](assets/preview/settings.webp) | |
| *Project dashboard* | *Settings & themes* | |

---

## Features

| Feature | Description |
| :--- | :--- |
| **Kanban Board** | Drag & drop columns, tasks, multi-facet filtering, inline editing |
| **Task Drawer** | Priority levels, tags, due date reminders, checklist sub-items |
| **Notebook Editor** | TipTap rich markdown editor with syntax highlighting, tables, slash `/` menu |
| **Asset Storage** | Ultra-lightweight self-hosted **SeaweedFS** S3 (~30MB RAM footprint) |
| **Smart Dynamic Resizing**| Native Go WebP thumbnail and image-variant generation engine |
| **Templates & Backup** | Project creation templates with full JSON export / import |
| **Theming Engine** | Dark (OLED), Dim (Graphite), Light (Paper) with 5 vibrant accent colors |
| **AI Integration** | Vector search (pgvector) + streaming LLM assistant *(WIP)* |

---

## Services & Architecture

**Service Ports & Stack**

| Service | Technology | Internal Port | Host Port | Description |
|:---|:---|:---:|:---:|:---|
| **Nginx** | Alpine 1.26 | `80` | `1106` | API Gateway & reverse proxy |
| **Web** | Next.js 16 · Bun · React 19 · Tailwind | `3000` | — | Frontend web application |
| **API** | Go 1.25 · Gin · GORM | `4000` | — | REST API & dynamic image processing |
| **AI** | Python 3.12 · FastAPI · pgvector | `5000` | — | RAG & LLM vector gateway |
| **PostgreSQL** | Postgres 16 + pgvector | `5432` | `5432` | Relational & vector database |
| **SeaweedFS** | SeaweedFS (Go) | `9000` | `9000` | Lightweight S3-compatible object storage |

**Request Flow**

```text
Browser → Nginx (:1106)
           ├── /          → Next.js Frontend (:3000)
           ├── /api/*     → Go REST API (:4000) ──→ PostgreSQL + pgvector
           ├── /ai/*      → FastAPI AI (:5000)   ──→ PostgreSQL + pgvector
           └── /storage/* → Go Media Proxy      ──→ SeaweedFS S3 (:9000)
```

---

## Local Development

```bash
# 1. Clone repository
git clone https://github.com/Ijon6k/Taskure.git
cd Taskure

# 2. Copy environment template
cp .env.example .env

# 3. Launch infrastructure with the interactive CLI manager
./scripts/dev.ts

# Or manually run background services with Docker / Podman:
docker compose up -d postgres seaweedfs

# Run backend API
cd backend && go run ./cmd/server

# Run frontend web
cd frontend && bun install && bun dev
```

---

## License

MIT © [Ijon6k](https://github.com/Ijon6k)
