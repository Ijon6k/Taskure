import type { TaskPriority } from "@/lib/helpers";

// ─── Project Settings (stored in JSONB column) ───────────────────────────────

export interface ResourceLinkItem {
  id: string;
  title: string;
  url: string;
  type?: "link" | "file" | "image" | undefined;
  preview_url?: string | undefined;
  size?: string | undefined;
  mime_type?: string | undefined;
  created_at?: string | undefined;
}

export interface ProjectSettings {
  target_goal?: string;
  target_date?: string;
  tags?: string[];
  resources?: ResourceLinkItem[];
  strategy_notes?: string;
}

// ─── Core Domain Types ────────────────────────────────────────────────────────

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: "active" | "paused" | "archived" | string;
  is_pinned?: boolean;
  is_archived: boolean;
  focus_enabled?: boolean;
  created_at: string;
  updated_at: string;
  // JSONB column — all flexible project metadata lives here
  settings?: ProjectSettings;
  columns?: ColumnData[];
  tasks?: TaskData[];
  contexts?: ProjectContextData[];
}

export interface ColumnData {
  id: string;
  name: string;
  behavior?: "active" | "completed";
  position: number;
  project_id: string;
  color?: string;
  tasks?: TaskData[];
  /** Lightweight per-column task total from the project list endpoint. */
  task_count?: number;
}

// ─── Lightweight list payload (GET /projects/summary) ────────────────────────
// Only the fields the sidebar, switchers, cards and filters actually read.
// The full ProjectData (with settings JSONB) is reserved for detail endpoints.

export interface ColumnSummaryData {
  id: string;
  name: string;
  behavior?: "active" | "completed";
  color?: string;
  /** Per-column task total used to render distribution bars. */
  task_count: number;
}

export interface ProjectSummaryData {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: "active" | "paused" | "archived" | string;
  is_pinned?: boolean;
  is_archived: boolean;
  focus_enabled?: boolean;
  updated_at: string;
  columns?: ColumnSummaryData[];
}

export interface ChecklistItemData {
  id: string;
  title: string;
  is_completed: boolean;
  position: number;
  task_id: string;
}

export interface LabelData {
  id: string;
  name: string;
  color: string;
  project_id?: string;
  workspace_id?: string;
}

export interface AttachmentData {
  id: string;
  type: "link" | "file";
  title: string;
  url?: string | undefined;
  preview_url?: string | undefined;
  size?: string | undefined;
  file_size?: number | undefined;
  mime_type?: string | undefined;
}

export interface ProjectContextData {
  id: string;
  title?: string;
  content: string;
  context_type: string;
  project_id: string;
  created_at: string;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  column_id: string;
  project_id: string;
  priority: TaskPriority;
  status: "todo" | "in_progress" | "done";
  position: number;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  // Tags stored as string array (matches backend UpdateTask JSON key)
  tags?: string[];
  // Legacy field from backend — kept for backwards compat
  labels?: LabelData[];
  checklist_items?: ChecklistItemData[];
  attachments?: AttachmentData[];
}

export interface FocusChecklistItemView {
  id: string;
  title: string;
  is_completed: boolean;
}

export interface FocusTaskView {
  id: string;
  title: string;
  priority: TaskPriority;
  due_date?: string;
  project_id: string;
  checklist_summary?: {
    completed: number;
    total: number;
  };
  checklist?: FocusChecklistItemView[];
}

export interface FocusProjectView {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface FocusItem {
  task: TaskData | FocusTaskView;
  project: ProjectData | FocusProjectView;
  score?: number;
  reason_tag?: string;
}

export interface FocusOverview {
  active_projects: number;
}

export interface WorkspaceSummary {
  active_projects_count: number;
  paused_projects_count: number;
  archived_projects_count: number;
  actionable_tasks_count: number;
  completed_tasks_today: number;
}

export interface FocusResponse {
  state_code: "FRESH" | "ARCHIVED" | "EMPTY" | "ACTIVE" | "CLEAR" | "PAUSED";
  active_projects_count: number;
  summary?: WorkspaceSummary;
  hero: FocusItem | null;
  recommendations: FocusItem[];
}

export type FocusResult = FocusResponse;

// ─── Input / Mutation Types ───────────────────────────────────────────────────

export interface CreateProjectInput {
  name: string;
  description?: string | undefined;
  color?: string | undefined;
  icon?: string | undefined;
  status?: string | undefined;
  is_pinned?: boolean | undefined;
  focus_enabled?: boolean | undefined;
  template?: string | undefined;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  focus_enabled?: boolean;
  // Overview fields — merged into settings JSONB by backend service
  target_goal?: string;
  target_date?: string;
  tags?: string[];
  resources?: ResourceLinkItem[];
  strategy_notes?: string;
}

export interface CreateColumnInput {
  name: string;
  color?: string;
  behavior?: "active" | "completed";
}

export interface UpdateColumnInput {
  name?: string;
  color?: string;
  position?: number;
  behavior?: "active" | "completed";
}

export interface CreateTaskInput {
  title: string;
  column_id: string;
  priority?: string;
  description?: string;
  due_date?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  due_date?: string | null;
  tags?: string[];
  attachments?: AttachmentData[] | undefined;
}

export interface MoveTaskInput {
  column_id: string;
  position: number;
  status?: string;
}
