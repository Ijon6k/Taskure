// ─── Project Settings (stored in JSONB column) ───────────────────────────────

export interface ResourceLinkItem {
  id: string;
  title: string;
  url: string;
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
  position: number;
  project_id: string;
  color?: string;
  tasks?: TaskData[];
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
  url?: string;
  size?: string;
  file_size?: number;
  mime_type?: string;
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
  priority: "urgent" | "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  position: number;
  due_date?: string;
  // Tags stored as string array (matches backend UpdateTask JSON key)
  tags?: string[];
  // Legacy field from backend — kept for backwards compat
  labels?: LabelData[];
  checklist_items?: ChecklistItemData[];
  attachments?: AttachmentData[];
}

export interface FocusResult {
  task: TaskData;
  project_name: string;
  project_color: string;
  score: number;
  reason: string;
  days_remaining?: number;
}

// ─── Input / Mutation Types ───────────────────────────────────────────────────

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: string;
  is_pinned?: boolean;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
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
}

export interface MoveTaskInput {
  column_id: string;
  position: number;
  status?: string;
}
