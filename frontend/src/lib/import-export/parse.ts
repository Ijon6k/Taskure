import { VALID_PRIORITIES, VALID_PROJECT_STATUSES } from "./constants";
import type { ImportKind, ParsedChecklistItem, ParsedColumn, ParsedImport, ParsedTask } from "./types";

// ─── Import: tolerant parser — only a task title is required ───────────────

/** Parses and validates a full imported board/workspace JSON document. */
export function parseImportJSON(jsonString: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON syntax.");
  }
  return parseImportObject(raw);
}

/** Parses an already-deserialized object (a board, project, or workspace-backup
 *  row) so callers can import without the extra JSON round-trip of
 *  `parseImportJSON`. Tolerant parser: only a project name or one column with a
 *  non-empty task title is required. Throws on invalid structure, duplicate
 *  column names, or duplicate task titles within a column. */
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

    // Duplicate task titles within a column can't round-trip (title-keyed
    // replace), so reject them up front with a clear message.
    const seenTaskTitles = new Set<string>();
    for (const task of column.tasks) {
      const taskKey = normalizeKey(task.title);
      if (seenTaskTitles.has(taskKey)) {
        throw new Error(`Duplicate task title "${task.title}" in column "${column.name}".`);
      }
      seenTaskTitles.add(taskKey);
    }
  }

  return parsed;
}

/** Unwraps common wrapper keys ('data', 'board', 'project') from an imported document. */
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

/** Maps an external payload shape to the internal kind used by import. */
function resolveKind(source: Record<string, unknown>): ImportKind {
  if (source.type === "board") return "board";
  if (source.type === "project") return "project";
  if (source.name || source.title) return "project";
  return "board";
}

/** Parses an imported column. Requires a non-empty name; yields its tasks and
 *  optional color. Returns null for invalid shapes so callers can filter them. */
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

/** Parses an imported task (title, priority, tags, due date, checklist). */
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

/** The backend expects RFC3339. Tolerate the "YYYY-MM-DD" shorthand the AI
 *  import template advertises and drop anything unparseable rather than failing
 *  the whole import; returns undefined when the value is empty/invalid. */
function normalizeDueDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Date-only shorthand: treat as UTC midnight, matching the DatePicker and
    // the backend's time.Parse("2006-01-02"), so the calendar day never shifts.
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  // Anything else JS can parse (ISO with/without zone, space-separated, …) is
  // normalized to RFC3339 UTC so the backend never silently drops it.
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Parses an imported tags field into a validated string array. */
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

/** Parses an imported checklist block into checklist items. */
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

/** Parses a single imported checklist item. */
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

/** Trims and normalizes an imported string, returning null for empty values. */
function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Normalizes an external field key (camelCase/snake_case) to the internal one. */
export function normalizeKey(value: string): string {
  return value.toLowerCase().trim();
}
