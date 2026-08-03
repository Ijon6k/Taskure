import { getGlobalCategories, getGlobalTags, saveGlobalCategory, saveGlobalTag } from "./tags";
import { projectsService } from "./api/services";
import type { ColumnData, ProjectData, TaskData } from "./api/types";
import { format } from "date-fns";

// ─── Portable JSON format (no ids, no timestamps — the backend owns ids) ───

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

const DEFAULT_PROJECT_COLOR = "#7F9CF5";
const DEFAULT_PROJECT_ICON = "📌";
const VALID_PRIORITIES = new Set(["none", "low", "medium", "high", "urgent"]);
const VALID_PROJECT_STATUSES = new Set(["active", "paused", "completed", "archived"]);

// ─── Export: strip everything the backend will regenerate ──────────────────

export function buildProjectJSON(project: ProjectData, scope: ExportScope): Record<string, unknown> {
  const columns = (project.columns ?? []).map(columnToExportJSON);

  if (scope === "board") {
    return { type: "board", columns };
  }

  return {
    type: "project",
    name: project.name,
    ...(project.description ? { description: project.description } : {}),
    ...(project.color ? { color: project.color } : {}),
    ...(project.icon ? { icon: project.icon } : {}),
    ...(project.status ? { status: project.status } : {}),
    columns,
  };
}

function columnToExportJSON(column: ColumnData): Record<string, unknown> {
  const out: Record<string, unknown> = { name: column.name };
  if (column.color) out.color = column.color;
  const tasks = (column.tasks ?? []).map(taskToExportJSON).filter((t): t is string | Record<string, unknown> => t !== null);
  if (tasks.length > 0) out.tasks = tasks;
  return out;
}

/** A title-only task exports as a plain string to keep the JSON minimal. */
function taskToExportJSON(task: TaskData): string | Record<string, unknown> | null {
  const detail: Record<string, unknown> = { title: task.title };
  if (task.description) detail.description = task.description;
  if (task.priority && task.priority !== "medium") detail.priority = task.priority;
  if (task.due_date) detail.due_date = task.due_date;
  if (task.tags && task.tags.length > 0) detail.tags = task.tags;

  const checklist = (task.checklist_items ?? []).map((item) =>
    item.is_completed ? { title: item.title, is_completed: true } : item.title
  );
  if (checklist.length > 0) detail.checklist = checklist;

  return Object.keys(detail).length === 1 ? task.title : detail;
}

// ─── Import: tolerant parser — only a task title is required ───────────────

export function parseImportJSON(jsonString: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON syntax.");
  }
  return parseImportObject(raw);
}

/** Parses an already-deserialized object (e.g. a workspace-backup project
 *  row) without the JSON round-trip that `parseImportJSON` would require. */
export function parseImportObject(raw: unknown): ParsedImport {
  const source = unwrapRoot(raw);
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("JSON must be a project or board object.");
  }

  const kind = resolveKind(source);
  if (kind === "board" && !Array.isArray(source.columns)) {
    throw new Error('Board JSON requires a "columns" array.');
  }

  const parsed: ParsedImport = {
    kind,
    columns: Array.isArray(source.columns)
      ? source.columns.map(parseColumn).filter((c): c is ParsedColumn => c !== null)
      : [],
  };
  const name = cleanString(source.name ?? source.title);
  const description = cleanString(source.description);
  const color = cleanString(source.color);
  const icon = cleanString(source.icon);
  const status = cleanString(source.status);
  if (name) parsed.name = name;
  if (description) parsed.description = description;
  if (color) parsed.color = color;
  if (icon) parsed.icon = icon;
  if (status && VALID_PROJECT_STATUSES.has(status)) parsed.status = status;

  if (parsed.columns.length === 0 && !parsed.name) {
    throw new Error("JSON must contain a project name or at least one column.");
  }

  const seenColumnNames = new Set<string>();
  for (const column of parsed.columns) {
    const key = normalizeKey(column.name);
    if (seenColumnNames.has(key)) {
      throw new Error(`Duplicate column name "${column.name}" in JSON.`);
    }
    seenColumnNames.add(key);
  }

  return parsed;
}

function unwrapRoot(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const maybe = raw as Record<string, unknown>;
  // Workspace backup compatibility: `{ projects: [...] }` → first project.
  if (Array.isArray(maybe.projects) && maybe.projects.length > 0) {
    const first = maybe.projects[0];
    if (first && typeof first === "object" && !Array.isArray(first)) return first as Record<string, unknown>;
  }
  return maybe;
}

function resolveKind(source: Record<string, unknown>): ImportKind {
  if (source.type === "board") return "board";
  if (source.type === "project") return "project";
  if (source.name || source.title) return "project";
  return "board";
}

function parseColumn(raw: unknown): ParsedColumn | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const name = cleanString(source.name ?? source.title);
  if (!name) return null;

  const parsedColumn: ParsedColumn = {
    name,
    tasks: Array.isArray(source.tasks)
      ? source.tasks.map(parseTask).filter((t): t is ParsedTask => t !== null)
      : [],
  };
  const color = cleanString(source.color);
  if (color) parsedColumn.color = color;
  return parsedColumn;
}

function parseTask(raw: unknown): ParsedTask | null {
  if (typeof raw === "string") {
    const title = raw.trim();
    return title ? { title } : null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const title = cleanString(source.title);
  if (!title) return null;

  const task: ParsedTask = { title };
  const description = cleanString(source.description);
  const priority = cleanString(source.priority);
  const dueDate = normalizeDueDate(cleanString(source.due_date ?? source.dueDate));
  const tags = parseTags(source);
  const checklist = parseChecklist(source);

  if (description) task.description = description;
  if (priority && VALID_PRIORITIES.has(priority)) task.priority = priority;
  if (dueDate) task.due_date = dueDate;
  if (tags) task.tags = tags;
  if (checklist) task.checklist = checklist;
  return task;
}

/** Backend expects RFC3339; tolerate the "YYYY-MM-DD" shorthand the AI template
 *  advertises, and drop anything unparseable instead of failing the import. */
function normalizeDueDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Date-only shorthand: treat as UTC midnight, matching the DatePicker and
    // the backend's time.Parse("2006-01-02"), so the calendar day never shifts.
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return Number.isNaN(Date.parse(value)) ? undefined : value;
}

function parseTags(source: Record<string, unknown>): string[] | undefined {
  if (Array.isArray(source.tags)) {
    return source.tags.map(String).map((tag) => tag.trim()).filter(Boolean);
  }
  if (Array.isArray(source.labels)) {
    return source.labels
      .map((label) => (label && typeof label === "object" ? cleanString((label as Record<string, unknown>).name) : undefined))
      .filter((name): name is string => Boolean(name));
  }
  return undefined;
}

function parseChecklist(source: Record<string, unknown>): ParsedChecklistItem[] | undefined {
  const rawItems = Array.isArray(source.checklist_items)
    ? source.checklist_items
    : Array.isArray(source.checklist)
      ? source.checklist
      : undefined;
  if (!rawItems) return undefined;

  const items = rawItems.map(parseChecklistItem).filter((item): item is ParsedChecklistItem => item !== null);
  return items.length > 0 ? items : undefined;
}

function parseChecklistItem(raw: unknown): ParsedChecklistItem | null {
  if (typeof raw === "string") {
    const title = raw.trim();
    return title ? { title } : null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const title = cleanString(source.title ?? source.text);
  if (!title) return null;

  const done = Boolean(source.is_completed ?? source.done);
  return done ? { title, is_completed: true } : { title };
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().trim();
}

// ─── Replace diff: what an import would change on an existing board ────────

export function buildReplaceDiff(project: ProjectData, parsed: ParsedImport): ImportDiff {
  const existingColumns = project.columns ?? [];
  const existingByName = new Map(existingColumns.map((col) => [normalizeKey(col.name), col]));
  const parsedByName = new Map(parsed.columns.map((col) => [normalizeKey(col.name), col]));

  const columns: ColumnDiff[] = [];
  let columnsAdded = 0;
  let columnsReplaced = 0;
  let tasksAdded = 0;
  let tasksRemoved = 0;

  for (const parsedColumn of parsed.columns) {
    const existing = existingByName.get(normalizeKey(parsedColumn.name));

    if (!existing) {
      const taskItems = parsedColumn.tasks.map((task): TaskDiffItem => ({ title: task.title, status: "added" }));
      columnsAdded++;
      tasksAdded += taskItems.length;
      columns.push({
        name: parsedColumn.name,
        ...(parsedColumn.color ? { color: parsedColumn.color } : {}),
        status: "added",
        taskItems,
        newTaskCount: parsedColumn.tasks.length,
        removedTaskCount: 0,
      });
      continue;
    }

    const oldTitles = new Set((existing.tasks ?? []).map((task) => normalizeKey(task.title)));
    const newTitles = new Set(parsedColumn.tasks.map((task) => normalizeKey(task.title)));

    const taskItems: TaskDiffItem[] = [];
    for (const task of parsedColumn.tasks) {
      const status = oldTitles.has(normalizeKey(task.title)) ? "unchanged" : "added";
      taskItems.push({ title: task.title, status });
      if (status === "added") tasksAdded++;
    }

    let removedCount = 0;
    for (const oldTask of existing.tasks ?? []) {
      if (!newTitles.has(normalizeKey(oldTask.title))) {
        removedCount++;
        tasksRemoved++;
        taskItems.push({ title: oldTask.title, status: "removed" });
      }
    }

    const isReplaced = taskItems.some((item) => item.status !== "unchanged");
    if (isReplaced) columnsReplaced++;
    columns.push({
      id: existing.id,
      name: parsedColumn.name,
      ...(parsedColumn.color ?? existing.color ? { color: parsedColumn.color ?? existing.color } : {}),
      status: isReplaced ? "replaced" : "unchanged",
      taskItems,
      newTaskCount: parsedColumn.tasks.length,
      removedTaskCount: removedCount,
    });
  }

  let columnsRemoved = 0;
  for (const existing of existingColumns) {
    if (parsedByName.has(normalizeKey(existing.name))) continue;
    const tasks = existing.tasks ?? [];
    columnsRemoved++;
    tasksRemoved += tasks.length;
    columns.push({
      id: existing.id,
      name: existing.name,
      ...(existing.color ? { color: existing.color } : {}),
      status: "removed",
      taskItems: tasks.map((task): TaskDiffItem => ({ title: task.title, status: "removed" })),
      newTaskCount: 0,
      removedTaskCount: tasks.length,
    });
  }

  return {
    columns,
    columnsAdded,
    columnsReplaced,
    columnsRemoved,
    tasksAdded,
    tasksRemoved,
  };
}
// ─── Apply: single bulk request per import ──────────────────────────────────

const COUNT_KEYS: ReadonlyArray<[keyof BoardMutationCounts, string]> = [
  ["columnsAdded", "columns_added"],
  ["columnsRemoved", "columns_removed"],
  ["tasksAdded", "tasks_added"],
  ["tasksRemoved", "tasks_removed"],
  ["checklistItemsAdded", "checklist_items_added"],
];

function mapImportCounts(raw: Record<string, number>): BoardMutationCounts {
  const counts: BoardMutationCounts = {
    columnsAdded: 0,
    columnsRemoved: 0,
    tasksAdded: 0,
    tasksRemoved: 0,
    checklistItemsAdded: 0,
  };
  for (const [camel, snake] of COUNT_KEYS) {
    counts[camel] = raw[snake] ?? 0;
  }
  return counts;
}

export async function applyImportCreate(parsed: ParsedImport): Promise<ImportApplyResult> {
  const result = await projectsService.importProject(parsed);
  return { project: result.project, ...mapImportCounts(result.counts) };
}

export async function applyImportReplace(projectId: string, parsed: ParsedImport): Promise<BoardMutationCounts> {
  const result = await projectsService.importBoard(projectId, parsed);
  return mapImportCounts(result.counts);
}

// ─── Legacy workspace backup (Settings page) ────────────────────────────────

export interface WorkspaceBackupPayload {
  version: number;
  exportedAt: string;
  projects: any[];
  categories: any[];
  tags: any[];
}

export async function exportFullWorkspaceJSON(): Promise<void> {
  const projectsSummary = await projectsService.getProjects();
  const fullProjects: any[] = [];

  for (const p of projectsSummary) {
    try {
      const fullProj = await projectsService.getProject(p.id);
      fullProjects.push(fullProj);
    } catch {
      fullProjects.push(p);
    }
  }

  const backupData: WorkspaceBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: fullProjects,
    categories: getGlobalCategories(),
    tags: getGlobalTags(),
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const link = document.createElement("a");
  link.href = url;
  link.download = `kanban-workspace-backup-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importFullWorkspaceJSON(
  jsonString: string
): Promise<{ success: boolean; projectCount: number; taskCount: number }> {
  try {
    const data: WorkspaceBackupPayload = JSON.parse(jsonString);

    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error("Invalid backup format: missing projects array.");
    }

    if (Array.isArray(data.categories)) {
      data.categories.forEach((cat) => saveGlobalCategory(cat));
    }
    if (Array.isArray(data.tags)) {
      data.tags.forEach((t) => saveGlobalTag(t));
    }

    let restoredProjectsCount = 0;

    for (const proj of data.projects) {
      try {
        await applyImportCreate(parseImportObject(proj));
        restoredProjectsCount++;
      } catch (err: any) {
        console.error("Failed to restore project:", proj.name, err);
      }
    }

    return {
      success: true,
      projectCount: restoredProjectsCount,
      taskCount: 0,
    };
  } catch (err: any) {
    throw new Error(err.message || "Failed to parse or restore workspace backup JSON.");
  }
}

export async function deleteAllWorkspaceData(): Promise<void> {
  const projects = await projectsService.getProjects();
  for (const proj of projects) {
    try {
      await projectsService.deleteProject(proj.id);
    } catch (err) {
      console.error("Failed to delete project:", proj.id, err);
    }
  }
}
