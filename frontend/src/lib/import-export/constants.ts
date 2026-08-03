import type { BoardMutationCounts } from "./types";

export const DEFAULT_PROJECT_COLOR = "#7F9CF5";
export const DEFAULT_PROJECT_ICON = "📌";
export const VALID_PRIORITIES = new Set(["none", "low", "medium", "high", "urgent"]);
export const VALID_PROJECT_STATUSES = new Set(["active", "paused", "completed", "archived"]);

export const COUNT_KEYS: ReadonlyArray<[keyof BoardMutationCounts, string]> = [
  ["columnsAdded", "columns_added"],
  ["columnsRemoved", "columns_removed"],
  ["tasksAdded", "tasks_added"],
  ["tasksRemoved", "tasks_removed"],
  ["checklistItemsAdded", "checklist_items_added"],
];
