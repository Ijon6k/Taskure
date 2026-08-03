# Taskure Database

PostgreSQL 16 (pgvector image). Schema is managed by GORM **AutoMigrate** at API startup — every model is registered in `models.AllModels()` (`backend/internal/models/models.go`).

> Schema changes land as model edits + AutoMigrate; for shape changes on existing rows run an explicit `ALTER` (AutoMigrate only adds/expands columns, it never drops or reshapes data).

## ID Conventions

Two ID systems coexist:

| Kind | Column | Format | JSON |
|---|---|---|---|
| Internal PK | `id` | UUIDv4 | hidden (`json:"-"`) for top-level entities |
| Public | `public_id` | NanoID with prefix | exposed as `json:"id"` |

NanoID prefixes: `ws_` (workspaces), `prj_` (projects), `tsk_` (tasks), `cap_` (captures), `ctx_` (project contexts). Sub-entities (columns, checklist items, attachments, …) keep UUID PKs exposed as `json:"id"` (`InternalBase`). A startup backfill (`BackfillNanoIDs`) fills missing `public_id` values on legacy rows.

All tables carry `created_at`, `updated_at`, and a soft-delete `deleted_at` (GORM `DeletedAt`).

## Entities

### users
Account table (auth is scaffolding; single user today).

| Column | Notes |
|---|---|
| `email` | unique, not null, 255 |
| `name` | not null, 100 |
| `password_hash` | not null, 255, never serialized |
| `avatar_url` | 500, optional |

### workspaces
Top-level container; exactly one default workspace today.

| Column | Notes |
|---|---|
| `slug` | unique, not null, 50 |
| `owner_id` | → users.id, indexed |
| `settings` | JSONB, default `{}` |

Relations: 1-N `projects`, 1-N `labels`.

### projects
| Column | Notes |
|---|---|
| `name` | not null, 100 |
| `workspace_id` / `owner_id` | indexed FKs |
| `icon` (10), `color` (7) | display |
| `status` | `active` default; indexed |
| `is_pinned` / `is_archived` / `focus_enabled` | booleans, indexed; `focus_enabled` gates the Focus engine |
| `settings` | JSONB, default `{}` — **holds `settings.resources`**, the overview resource/link list |

Relations: 1-N `columns`, 1-N `tasks`, 1-N `project_contexts`, 1-N `discussions`.

### columns
| Column | Notes |
|---|---|
| `name` | not null, **200** (long column names are supported) |
| `behavior` | `active` (default) \| `completed` — completed columns apply status rules on task move |
| `position` | composite index `idx_column_project_position (project_id, position)` |
| `wip_limit` | nullable int (not enforced yet) |

`task_count` is a GORM-computed field (`gorm:"-"`) populated by lightweight list queries — never persisted.

### tasks
The central entity.

| Column | Notes |
|---|---|
| `title` | not null, 200 |
| `description` | text |
| `column_id` | indexed: `idx_task_column_position (column_id, position)` + `idx_task_column_position_single` |
| `project_id` | indexed: `idx_task_project_status (project_id, status)` + plain index |
| `assignee_id` | → users.id, nullable |
| `priority` | `low \| medium \| high \| urgent`, default `medium`, indexed |
| `status` | e.g. `todo \| done`, default `todo`, indexed |
| `due_date` / `start_date` | nullable timestamps |
| `estimated_hours` / `actual_hours` | nullable floats |
| `tags` | JSONB array of strings, default `[]` |
| `attachments_json` | JSONB array of attachment descriptors, default `[]` |

Relations: N-1 `columns` (cascade), N-N `labels` via `task_labels`, 1-N `checklist_items` (cascade), 1-N `task_notes`, 1-N `attachments`.

### labels
| Column | Notes |
|---|---|
| `name` (30) + `color` (7) | not null |
| `project_id` | nullable — null = workspace-global label |
| `workspace_id` | not null, indexed |

Many-to-many with tasks through `task_labels`.

### checklist_items
Subtasks. `title` (200), `is_completed`, `position`, `task_id` (indexed, cascade), `assignee_id` (nullable).

### task_notes
`content` (text), `task_id` / `author_id` (indexed), `is_pinned`. No endpoints yet.

### attachments
Task attachments persisted outside `attachments_json` (legacy-path rows):

| Column | Notes |
|---|---|
| `filename` (255), `file_size` (int8), `mime_type` (100) | not null |
| `storage_key` (500) | MinIO object key |
| `task_id` | indexed, cascade |
| `uploader_id` | not null |

### captures
Quick-capture scratch notes. `content` (text), `source` (20), `user_id` / `workspace_id` (indexed), `processed_at` (nullable). No endpoints yet.

### project_contexts
RAG chunk storage.

| Column | Notes |
|---|---|
| `content` (text), `chunk_index`, `total_chunks` | chunking metadata |
| `context_type` (30) | chunk category |
| `metadata` | JSONB |
| `embedding` | JSONB (pgvector-compatible), never serialized |

### discussions
Threaded comments. `content` (text), `task_id`/`project_id`/`author_id` (indexed), `parent_id` (self-FK), `mentions` (JSONB). No endpoints yet.

### image_variant_jobs
Background image-processing queue (uploads enqueue; the worker drains):

| Column | Notes |
|---|---|
| `object_key` (500) | indexed |
| `status` | `pending \| processing \| done \| failed`, composite index `idx_variant_job_queue (status, …)` |
| `attempts`, `last_error`, `processed_at` | retry bookkeeping |

### activities
Audit trail: `action` (50), `entity_type` (30), `entity_id`/`actor_id` (indexed), `metadata` (JSONB). No endpoints yet.

### project_tag_stats
Suggested-tag backing store:

| Column | Notes |
|---|---|
| `project_id` + `tag_name` (50) | composite unique `idx_proj_tag_stat` |
| `usage_count`, `last_used_at` | both indexed; incremented on task create/update |

## Indexes Worth Knowing

- `idx_column_project_position (project_id, position)` — board load order.
- `idx_task_column_position (column_id, position)` — in-column ordering.
- `idx_task_project_status (project_id, status)` — project status filtering.
- `idx_variant_job_queue` — worker claim query.
- Unique: `workspaces.slug`, `users.email`, `idx_proj_tag_stat`.

## Accessing the Database

```bash
docker exec -it kanban-postgres psql -U kanban -d kanban
```

Example manual migration (column name expansion):

```bash
docker exec kanban-postgres psql -U kanban -d kanban -c "ALTER TABLE columns ALTER COLUMN name TYPE varchar(200);"
```
