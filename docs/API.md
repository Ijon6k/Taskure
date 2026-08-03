# Taskure API Reference

Base URL: `http://localhost:1106/api` (via nginx in production) or `http://localhost:4000/api` (backend directly).

- All requests and responses are JSON unless noted (file uploads use `multipart/form-data`).
- Success responses return the payload directly (`{ "project": { ... } }`).
- Errors return `{ "error": "<message>" }`.

## Authentication

Authentication is **not enforced yet**. JWT scaffolding exists (`JWT_SECRET`, `JWT_EXPIRY_HRS`) but no middleware guards the routes — the API is currently single-user/local only. This will change when multi-user auth ships.

## Global Middleware

| Middleware | Effect |
|---|---|
| `CORS` | Allows origins from `API_CORS_ORIGINS` (default `http://localhost:3000,http://localhost:8080`). |
| `MaxBodySize` | Rejects bodies larger than **500 MB**. |
| `Recovery` / `Logger` | Panic recovery and zerolog request logging. |
| `UploadRateLimiter` | **60 requests / min / IP** on upload + delete-resource routes. |
| `SeedRateLimiter` | **10 requests / min / IP** on `POST /api/seed`. |

Rate limit hit → `429` with `{ "error": "Rate limit exceeded. Try again later." }`.

## Status Codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created (project, task, column, import) |
| `400` | Invalid request payload / validation failure |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal error (real message only in debug mode) |

---

## Health

### `GET /health`

```
200 { "status": "ok", "service": "api" }
```

## Storage (public)

### `GET /storage/*filepath`

Serves files from MinIO through the API. Path shape: `/storage/<bucket>/<object-key>`.
Used as the `MINIO_PUBLIC_URL` for all generated asset URLs.

---

## Workspaces

### `GET /api/workspaces/default`

Returns the default (only) workspace.

```json
200
{
  "workspace": {
    "id": "ws_abc123...",
    "name": "My Workspace",
    "slug": "my-workspace",
    "description": null,
    "settings": {},
    "created_at": "2026-07-01T10:00:00Z",
    "updated_at": "2026-07-01T10:00:00Z"
  }
}
```

### `PATCH /api/workspaces/default`

Body (all optional):

```json
{ "name": "New Name", "description": "Optional description" }
```

Returns the updated workspace in the same shape as above.

---

## Projects

All project endpoints accept either the internal UUID or the public NanoID (`prj_...`) in `:id`.

### `GET /api/projects`

Query params: `?status=active&search=...&pinned=true`

Returns the **full** project list (with settings + counts). Used by the board pages.

### `GET /api/projects/summary`

Same query params, but returns the **lightweight** list used by the sidebar, project switcher and cards — no settings JSONB, no timestamps beyond `updated_at`:

```json
200
{
  "projects": [
    {
      "id": "prj_abc...",
      "name": "Website Redesign",
      "description": null,
      "color": "#6366f1",
      "icon": "🚀",
      "status": "active",
      "is_pinned": false,
      "is_archived": false,
      "focus_enabled": true,
      "updated_at": "2026-07-10T08:30:00Z",
      "columns": [
        { "id": "1b2c...", "name": "Backlog", "behavior": "active", "color": null, "task_count": 4 }
      ]
    }
  ]
}
```

### `POST /api/projects`

```json
{
  "name": "Website Redesign",
  "description": "Marketing site refresh",
  "color": "#6366f1",
  "icon": "🚀"
}
```

Returns `201 { "project": { ... } }` (full project object).

### `GET /api/projects/:id`

Returns project metadata + settings + columns (with counts) — **no task rows**.

### `GET /api/projects/:id/board`

Returns the full board: project + columns ordered by position, each with its tasks (checklists, labels, tags, attachments):

```json
200
{
  "project": {
    "id": "prj_abc...",
    "name": "Website Redesign",
    "settings": { "resources": [] },
    "columns": [
      {
        "id": "1b2c...",
        "name": "Backlog",
        "behavior": "active",
        "position": 0,
        "color": null,
        "wip_limit": null,
        "tasks": [
          {
            "id": "tsk_xyz...",
            "title": "Redesign hero section",
            "description": "…",
            "priority": "high",
            "status": "todo",
            "position": 0,
            "due_date": "2026-08-15T00:00:00Z",
            "tags": ["design", "marketing"],
            "attachments": [],
            "checklist_items": [
              { "id": "…", "title": "Wireframe", "is_completed": true, "position": 0, "task_id": "…" }
            ]
          }
        ]
      }
    ]
  }
}
```

This is the heaviest endpoint (full board payload); the frontend keeps it cached in React Query and patches it locally on mutations instead of refetching.

### `GET /api/projects/:id/overview`

Lightweight overview: columns ordered by position, tasks reduced to light fields (`id`, `title`, `priority`, `status`, `due_date`, `position`, timestamps) — no checklists/labels/descriptions. Use for the overview list and distribution bars.

### `GET /api/projects/:id/assets`

Asset Explorer payload — flattens overview **resources** (from `settings.resources`) and **task attachments** into one view:

```json
200
{
  "resources": [
    {
      "id": "…",
      "title": "Design spec",
      "kind": "link",
      "url": "https://…",
      "size": null,
      "mime_type": null,
      "created_at": "…",
      "source_kind": "overview",
      "source_label": "Website Redesign",
      "task_id": null
    }
  ],
  "attachments": [
    {
      "id": "…",
      "title": "hero.png",
      "kind": "image",
      "url": "/storage/kanban-uploads/…",
      "preview_url": "/storage/kanban-uploads/…",
      "size": "42.5 KB",
      "mime_type": "image/png",
      "created_at": "…",
      "source_kind": "task",
      "source_label": "Redesign hero section",
      "task_id": "tsk_xyz..."
    }
  ]
}
```

`kind` is `link` for resources and `image`/`file` for attachments (derived client-side from mime type when missing).

### `PATCH /api/projects/:id`

Body (all optional):

```json
{
  "name": "…", "description": "…", "color": "#…", "icon": "…",
  "status": "active|paused|archived", "is_pinned": true,
  "is_archived": false, "focus_enabled": true
}
```

Status and colors are normalized. Project-scoped queries are invalidated on success.

### `DELETE /api/projects/:id`

Returns `200 { "message": "Project deleted" }` (or similar message envelope).

### `GET /api/projects/:id/suggested-tags`

Returns the most-used tags in the project (backed by `project_tag_stats`).

---

## Columns

### `POST /api/projects/:id/columns`

```json
{ "name": "In Progress", "behavior": "active", "position": 1, "color": "#f59e0b" }
```

`behavior`: `active` (default) or `completed` — completed columns apply status rules when tasks move into them. Returns `201 { "column": { ... } }`.

### `PATCH /api/columns/:id`

```json
{ "name": "…", "color": "…", "position": 2, "behavior": "active" }
```

### `DELETE /api/columns/:id`

Deletes the column (cascades its tasks).

---

## Tasks

### `POST /api/projects/:id/tasks`

```json
{
  "title": "Write release notes",
  "description": "…",
  "priority": "low|medium|high|urgent",
  "due_date": "2026-08-20T00:00:00Z",
  "tags": ["release"],
  "column_id": "1b2c…"
}
```

`column_id` is required (must belong to the project). Returns `201 { "task": { ... } }`.

### `GET /api/tasks/:id`

Returns one task with checklist items and labels.

### `PATCH /api/tasks/:id/move`

Move or reposition a task:

```json
{ "column_id": "2d3e…", "position": 1 }
```

Column behavior rules apply (e.g. moving into a `completed` column sets the task status accordingly). Returns the updated task.

### `PATCH /api/tasks/:id`

Partial update:

```json
{
  "title": "…", "description": "…", "priority": "high", "status": "done",
  "due_date": "2026-08-20T00:00:00Z", "tags": ["a", "b"],
  "attachments": [ { "storage_key": "…", "filename": "…", "file_size": 1024, "mime_type": "image/png" } ]
}
```

`attachments` replaces the attachment list (JSONB column). Returns the updated task.

### `DELETE /api/tasks/:id`

Deletes the task and its attachment objects from storage. Returns a message envelope.

### `POST /api/tasks/:id/attachments`

Multipart upload: `form-data` field `file`. Rate limited (60/min/IP).

Returns the attachment record with `url`, `preview_url`/`thumbnail_url` when image variants are ready. The object is also enqueued for background WebP variant generation.

### `DELETE /api/tasks/:id/attachments/:attachmentId`

Removes the attachment row and deletes the object from storage. Rate limited.

---

## Checklist items

### `POST /api/tasks/:id/checklist`

```json
{ "title": "Draft copy", "position": 0 }
```

Returns `201 { "checklist_item": { ... } }`.

### `PATCH /api/checklist/:id`

```json
{ "title": "…", "is_completed": true, "position": 1 }
```

### `DELETE /api/checklist/:id`

Deletes the checklist item.

---

## Focus ("Today's Focus")

### `GET /api/focus`

Returns the focus engine result: hero task + recommendations, scored by deadline windows, priority, blocking subtasks and recent activity. Requires no params — the client's timezone drives deadline reason tags.

```json
200
{
  "state_code": "ACTIVE",
  "active_projects_count": 2,
  "summary": {
    "active_projects_count": 2,
    "paused_projects_count": 0,
    "archived_projects_count": 0,
    "actionable_tasks_count": 5,
    "completed_tasks_today": 1
  },
  "hero": {
    "task": {
      "id": "tsk_…", "title": "…", "priority": "high", "due_date": null,
      "project_id": "prj_…",
      "checklist_summary": { "completed": 2, "total": 3 },
      "checklist": [ { "id": "…", "title": "…", "is_completed": false } ]
    },
    "project": { "id": "prj_…", "name": "…", "color": "…", "icon": "…" },
    "reason_tag": "Due today"
  },
  "recommendations": []
}
```

`state_code` values: `FRESH`, `ARCHIVED`, `EMPTY`, `PAUSED`, `CLEAR`, `ACTIVE`.
`reason_tag` values: `Overdue`, `Due today`, `Near deadline`, `High priority`, `Blocking progress`, `Recently active`, `Up next`.

### `GET /api/focus/overview`

Aggregates focus-eligible/excluded project counts (used by the focus page header).

---

## Bulk import

### `POST /api/projects/import`

Create a project **and** its board from one JSON payload. Use for templates / backups:

```json
{
  "name": "New Project",
  "color": "#10b981",
  "columns": [
    {
      "name": "Backlog",
      "behavior": "active",
      "tasks": [
        { "title": "Task one", "description": "…", "priority": "medium", "tags": ["tag"] }
      ]
    }
  ]
}
```

Returns `201 { "project": { ... }, "counts": { "columns": 1, "tasks": 1 } }`.

### `POST /api/projects/:id/import`

**Atomically replaces** the board of an existing project: deletes existing columns/tasks, then recreates from the `columns` array. Column names up to **200 chars**.

```json
200 { "counts": { "columns": 3, "tasks": 14 } }
```

Validation failures → `400` with a descriptive message.

---

## Demo seed

### `POST /api/seed`

Seeds a demo workspace/project board. Rate limited (10/min/IP). No body required.

---

## Response envelopes

Success responses are plain payloads; error responses are always:

```json
{ "error": "Project not found" }
```

`400` validation errors may include specific messages (e.g. import validation).
