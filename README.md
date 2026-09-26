<div align="center">
  <img src="assets/taskurelogo2.webp" alt="Taskure" width="96" />
</div>

<div align="center">
  <a href="https://go.dev"><img src="https://img.shields.io/badge/Go-00ADD8?logo=go&logoColor=white" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js" /></a>
  <a href="https://caddyserver.com"><img src="https://img.shields.io/badge/Caddy-Gateway-1F88C0?logo=caddy&logoColor=white" /></a>
  <a href="https://podman.io"><img src="https://img.shields.io/badge/Podman-ready-892CA0?logo=podman&logoColor=white" /></a>
  <a href="https://www.docker.com"><img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" /></a>
  <a href="#"><img src="https://img.shields.io/badge/status-alpha-orange" /></a>
</div>

<div align="center">
  <b>Taskure</b> — self-hosted personal workspace for Kanban, notes, and assets.
</div>

---

## Deployment & Getting Started

### Option 1: Standalone Compose Deployment (Recommended)

You do **not** need to clone the entire repository to run Taskure. The recommended way is to run Taskure inside a dedicated folder anywhere on your machine (e.g. `~/taskure/compose` or `/opt/taskure/compose`):

```bash
# 1. Create a dedicated taskure/compose folder somewhere on your machine
mkdir -p ~/taskure/compose && cd ~/taskure/compose

# 2. Download the compose file and environment example
curl -fsSL https://raw.githubusercontent.com/Ijon6k/Taskure/dev/compose.yaml -o compose.yaml
curl -fsSL https://raw.githubusercontent.com/Ijon6k/Taskure/dev/.env.example -o .env.example

# 3. Copy the example environment file to .env
cp .env.example .env

# (Optional) Customize settings if needed (e.g., custom port, password, image tag):
# nano .env

# 4. Start the stack (Docker or Podman)
docker compose up -d
# or using Podman:
podman compose up -d

# → Access Taskure in your browser at: http://localhost:1106
```

#### Container Image Tags (`IMAGE_TAG` in `.env`)
You can configure which image version to run by editing `IMAGE_TAG` in your `.env` file before running compose:
* **`IMAGE_TAG=latest`** *(Default & Recommended)*: Tracks the latest official stable release.
* **`IMAGE_TAG=dev`**: Bleeding-edge build directly from the active `dev` branch.
* **`IMAGE_TAG=sha-<commit>`**: Pinned commit build (e.g. `sha-8a4e321`) for strictly reproducible deployments.

---

### Option 2: Clone & Build from Source (For Developers)

If you are developing Taskure or want to build container images locally from source code:

```bash
# 1. Clone the repository
git clone https://github.com/Ijon6k/Taskure.git
cd Taskure

# 2. Prepare environment file
cp .env.example .env

# 3. Build and launch all services locally
docker compose up -d --build
# or using Podman:
podman compose up -d --build

# → Access Taskure in your browser at: http://localhost:1106
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

| Feature |
| :--- |
| **Kanban board** — drag & drop columns, tasks, inline editing |
| **Task drawer** — priority, tags, due date, checklist items |
| **Notebook** — TipTap markdown editor, tables, `/` slash menu |
| **File attachments** — self-hosted Alpine MinIO S3 object storage |
| **Filters & sorting** — multi-facet, compact toolbar |
| **Project templates** + JSON export/import |
| **Themes** — dark (OLED), dim (graphite), light (paper) · 5 accent colors |
| **AI Assistant & Streaming Chat** — RAG pipeline with pgvector |
| **Zero port exposure** — strictly isolated behind Caddy gateway on port 1106 |

---

## Services & Architecture

In production, **only port 1106 is exposed to the host machine**. All internal services communicate strictly over the internal container network (`kanban-network`).

**Service Stack**

| Service | Container Image / Technology | Host Port | Internal Network Port |
|:---|:---|:---:|:---:|
| **Caddy Gateway** | `docker.io/caddy:2-alpine` (Custom packaged) | **`1106`** | `80` |
| **Web** | Next.js 16 · React 19 · Bun runtime | *None* | `3000` |
| **API** | Go 1.24 · Gin · GORM | *None* | `4000` |
| **AI Service** | Python 3.12 · FastAPI · uv | *None* | `5000` |
| **PostgreSQL** | `docker.io/pgvector/pgvector:pg16` | *None* | `5432` |
| **MinIO** | `docker.io/alpine/minio:RELEASE.2025-10-15T17-29-55Z` | *None* | `9000` |

**Request Flow**

```text
Client Browser → Caddy Gateway (:1106)
                   ├── /          → Next.js Frontend (:3000)
                   ├── /api/*     → Go REST API (:4000) ──→ PostgreSQL + MinIO
                   ├── /ai/*      → FastAPI Service (:5000) ──→ PostgreSQL (pgvector)
                   └── /storage/* → MinIO S3 Storage Engine (:9000 via API)
```

---

## Local Development (Without Containers)

If you wish to run backend and frontend directly on your host machine:

```bash
# Start backing stores
docker compose -f compose.dev.yaml up -d postgres minio
# or: podman compose -f compose.dev.yaml up -d postgres minio

# Run Go backend
cd backend && go run ./cmd/server

# Run Next.js frontend
cd frontend && bun install && bun dev
```

---

## License

MIT · [Ijon6k](https://github.com/Ijon6k)
