import { format } from "date-fns";
import { getGlobalCategories, getGlobalTags } from "../tags";
import type { ColumnData, ProjectData, TaskData } from "../api/types";
import { projectsService } from "../api/services";
import type { ExportScope, WorkspaceBackupPayload } from "./types";

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

// ─── Legacy workspace backup (Settings page) ────────────────────────────────

export async function exportFullWorkspaceJSON(): Promise<void> {
  const projectsSummary = await projectsService.getProjects();
  const fullProjects: ProjectData[] = [];

  for (const p of projectsSummary) {
    try {
      // Board endpoint: the portable export needs full task rows.
      const fullProj = await projectsService.getProjectBoard(p.id);
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
