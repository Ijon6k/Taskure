import { getGlobalCategories, getGlobalTags, saveGlobalCategory, saveGlobalTag } from "./tags";
import { projectsService, columnsService, tasksService } from "./api/services";
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
    return Number.isNaN(Date.parse(`${value}T00:00:00`)) ? undefined : new Date(`${value}T00:00:00`).toISOString();
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

// ─── Apply: create a new project from JSON ──────────────────────────────────

export async function applyImportCreate(parsed: ParsedImport): Promise<ImportApplyResult> {
  const project = await projectsService.createProject({
    name: parsed.name ?? "Imported Board",
    description: parsed.description ?? "",
    color: parsed.color ?? DEFAULT_PROJECT_COLOR,
    icon: parsed.icon ?? DEFAULT_PROJECT_ICON,
    status: parsed.status ?? "active",
    template: "blank",
  });

  const counts = await populateBoard(project.id, parsed.columns);
  return { project, ...counts };
}

async function populateBoard(projectId: string, columns: ParsedColumn[]): Promise<BoardMutationCounts> {
  const counts: BoardMutationCounts = {
    columnsAdded: 0,
    columnsRemoved: 0,
    tasksAdded: 0,
    tasksRemoved: 0,
    checklistItemsAdded: 0,
  };

  for (const parsedColumn of columns) {
    const column = await columnsService.createColumn(projectId, {
      name: parsedColumn.name,
      ...(parsedColumn.color ? { color: parsedColumn.color } : {}),
    });
    counts.columnsAdded++;
    await createTasks(projectId, column.id, parsedColumn.tasks, counts);
  }

  return counts;
}

// ─── Apply: replace the current board + project metadata ───────────────────

export async function applyImportReplace(projectId: string, parsed: ParsedImport): Promise<BoardMutationCounts> {
  const current = await projectsService.getProject(projectId);
  const existingColumns = current.columns ?? [];
  const existingByName = new Map(existingColumns.map((col) => [normalizeKey(col.name), col]));
  const parsedNames = new Set(parsed.columns.map((col) => normalizeKey(col.name)));

  const counts: BoardMutationCounts = {
    columnsAdded: 0,
    columnsRemoved: 0,
    tasksAdded: 0,
    tasksRemoved: 0,
    checklistItemsAdded: 0,
  };

  // 1. Create missing columns first so every parsed column has a target id.
  const columnIds = new Map<string, string>();
  for (const parsedColumn of parsed.columns) {
    const key = normalizeKey(parsedColumn.name);
    const existing = existingByName.get(key);
    if (existing) {
      columnIds.set(key, existing.id);
      continue;
    }
    const column = await columnsService.createColumn(projectId, {
      name: parsedColumn.name,
      ...(parsedColumn.color ? { color: parsedColumn.color } : {}),
    });
    columnIds.set(key, column.id);
    counts.columnsAdded++;
  }

  // 2. Sync tasks per column: delete only tasks whose title is absent from the
  //    JSON, create only tasks absent from the column. Title-matched tasks are
  //    kept as-is (content, checklist and attachments survive the import).
  for (const parsedColumn of parsed.columns) {
    const key = normalizeKey(parsedColumn.name);
    const columnId = columnIds.get(key);
    if (!columnId) continue;

    const existing = existingByName.get(key);
    if (!existing) {
      await createTasks(projectId, columnId, parsedColumn.tasks, counts);
      continue;
    }

    const existingTitles = new Set((existing.tasks ?? []).map((task) => normalizeKey(task.title)));
    const parsedTitles = new Set(parsedColumn.tasks.map((task) => normalizeKey(task.title)));
    const kept = (existing.tasks ?? []).filter((task) => parsedTitles.has(normalizeKey(task.title)));
    const toDelete = (existing.tasks ?? []).filter((task) => !parsedTitles.has(normalizeKey(task.title)));
    await deleteTasks(toDelete, counts);

    const missingTasks = parsedColumn.tasks.filter((task) => !existingTitles.has(normalizeKey(task.title)));
    const createdIds = await createTasks(projectId, columnId, missingTasks, counts);
    await reorderColumnTasks(columnId, parsedColumn.tasks, kept, createdIds);
  }

  // 3. Delete columns absent from the JSON. The backend does not cascade, so
  //    delete the column's tasks explicitly first to avoid orphans.
  for (const existing of existingColumns) {
    if (parsedNames.has(normalizeKey(existing.name))) continue;
    await deleteTasks(existing.tasks ?? [], counts);
    try {
      await columnsService.deleteColumn(existing.id);
      counts.columnsRemoved++;
    } catch {
      // Column may already be gone; count only successful removals.
    }
  }

  // 4. Reorder columns to match the JSON order.
  await reorderColumns(columnIds, parsed.columns);

  // Replace is board-scoped: project metadata (name, color, …) in the JSON is
  // ignored — it only ever matters when creating a brand-new project.
  return counts;
}

async function deleteTasks(tasks: TaskData[], counts: BoardMutationCounts): Promise<void> {
  const settled = await Promise.allSettled(tasks.map((task) => tasksService.deleteTask(task.id)));
  counts.tasksRemoved += settled.filter((result) => result.status === "fulfilled").length;
}

/** Reorders a column's tasks to match the JSON order. Kept tasks hold their
 *  original positions; newly created tasks are appended in creation order. */
async function reorderColumnTasks(
  columnId: string,
  parsedTasks: ParsedTask[],
  kept: TaskData[],
  createdIds: Map<string, string>
): Promise<void> {
  const target = parsedTasks.map((task) => normalizeKey(task.title));
  const current: (string | undefined)[] = [
    ...kept.map((task) => normalizeKey(task.title)),
    ...parsedTasks
      .map((task) => normalizeKey(task.title))
      .filter((title) => createdIds.has(title)),
  ];
  if (current.length !== target.length || current.some((title, i) => title !== target[i])) {
    for (let position = 0; position < target.length; position++) {
      const title = target[position];
      if (!title || current[position] === title) continue;
      const id = createdIds.get(title) ?? kept.find((task) => normalizeKey(task.title) === title)?.id;
      if (!id) continue;
      await tasksService.moveTask(id, { column_id: columnId, position });
      const from = current.indexOf(title);
      if (from !== -1) {
        current.splice(from, 1);
        current.splice(position, 0, title);
      }
    }
  }
}

async function createTasks(
  projectId: string,
  columnId: string,
  tasks: ParsedTask[],
  counts: BoardMutationCounts
): Promise<Map<string, string>> {
  const createdIds = new Map<string, string>();
  for (const parsedTask of tasks) {
    const task = await tasksService.createTask(projectId, {
      column_id: columnId,
      title: parsedTask.title,
      ...(parsedTask.description ? { description: parsedTask.description } : {}),
      ...(parsedTask.priority ? { priority: parsedTask.priority } : {}),
      ...(parsedTask.due_date ? { due_date: parsedTask.due_date } : {}),
      ...(parsedTask.tags && parsedTask.tags.length > 0 ? { tags: parsedTask.tags } : {}),
    });
    if (!createdIds.has(normalizeKey(parsedTask.title))) {
      createdIds.set(normalizeKey(parsedTask.title), task.id);
    }
    counts.tasksAdded++;

    if (parsedTask.checklist && parsedTask.checklist.length > 0) {
      for (const item of parsedTask.checklist) {
        const created = await tasksService.addChecklistItem(task.id, item.title);
        counts.checklistItemsAdded++;
        if (item.is_completed) {
          await tasksService.updateChecklistItem(created.id, { is_completed: true });
        }
      }
    }
  }

  return createdIds;
}

async function reorderColumns(columnIds: Map<string, string>, parsedColumns: ParsedColumn[]): Promise<void> {
  for (let position = 0; position < parsedColumns.length; position++) {
    const parsedColumn = parsedColumns[position];
    if (!parsedColumn) continue;
    const columnId = columnIds.get(normalizeKey(parsedColumn.name));
    if (columnId) {
      await columnsService.updateColumn(columnId, { position });
    }
  }
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

export async function importSingleProjectJSON(jsonString: string): Promise<ProjectData> {
  const parsed = parseImportJSON(jsonString);
  const result = await applyImportCreate(parsed);
  return result.project;
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
        await importSingleProjectJSON(JSON.stringify(proj));
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
