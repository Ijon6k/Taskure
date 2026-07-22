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
  columns?: ColumnData[];
  tasks?: TaskData[];
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

export interface TaskData {
  id: string;
  title: string;
  description?: string | undefined;
  column_id: string;
  project_id: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  position: number;
  due_date?: string | undefined;
  checklist_items?: ChecklistItemData[];
}

export interface FocusResult {
  task: TaskData;
  project_name: string;
  project_color: string;
  score: number;
  reason: string;
  days_remaining?: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: string;
  is_pinned?: boolean;
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
}

export interface MoveTaskInput {
  column_id: string;
  position: number;
  status?: string;
}
