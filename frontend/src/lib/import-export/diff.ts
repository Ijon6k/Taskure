import type { ProjectData } from "../api/types";
import { normalizeKey } from "./parse";
import type { ColumnDiff, ImportDiff, ParsedImport, TaskDiffItem } from "./types";

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
