import type { ProjectData } from "../api/types";
import type { CustomTag, TagCategory } from "../tags";

export type ImportKind = "project" | "board";
export type ExportScope = "project" | "board";

export interface ParsedChecklistItem {
  title: string;
  is_completed?: boolean;
}

export interface ParsedTask {
  title: string;
  description?: string;
  priority?: string;
  due_date?: string;
  tags?: string[];
  checklist?: ParsedChecklistItem[];
}

export interface ParsedColumn {
  name: string;
  color?: string;
  tasks: ParsedTask[];
}

export interface ParsedImport {
  kind: ImportKind;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: string;
  columns: ParsedColumn[];
}

export interface ImportDiff {
  columns: ColumnDiff[];
  columnsAdded: number;
  columnsReplaced: number;
  columnsRemoved: number;
  tasksAdded: number;
  tasksRemoved: number;
}

export type ColumnDiffStatus = "added" | "replaced" | "removed" | "unchanged";

export interface TaskDiffItem {
  title: string;
  status: "added" | "removed" | "unchanged";
}

export interface ColumnDiff {
  id?: string;
  name: string;
  color?: string;
  status: ColumnDiffStatus;
  taskItems: TaskDiffItem[];
  newTaskCount: number;
  removedTaskCount: number;
}

export interface BoardMutationCounts {
  columnsAdded: number;
  columnsRemoved: number;
  tasksAdded: number;
  tasksRemoved: number;
  checklistItemsAdded: number;
}

export interface ImportApplyResult extends BoardMutationCounts {
  project: ProjectData;
}

export interface WorkspaceBackupPayload {
  version: number;
  exportedAt: string;
  projects: ProjectData[];
  categories: TagCategory[];
  tags: CustomTag[];
}
