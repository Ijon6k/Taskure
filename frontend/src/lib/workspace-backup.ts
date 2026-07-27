import { getGlobalCategories, getGlobalTags, saveGlobalCategory, saveGlobalTag } from "./tags";
import { projectsService, columnsService, tasksService } from "./api/services";
import { format } from "date-fns";

export interface WorkspaceBackupPayload {
  version: number;
  exportedAt: string;
  projects: any[];
  categories: any[];
  tags: any[];
}

/**
 * Compiles all projects, columns, tasks, checklist items, categories, and tags
 * into a structured JSON string and triggers browser download.
 */
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

  const categories = getGlobalCategories();
  const tags = getGlobalTags();

  const backupData: WorkspaceBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: fullProjects,
    categories,
    tags,
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

/**
 * Validates and imports a single project or board JSON string into the workspace.
 * Creates the project, matches or creates columns, and populates all tasks & checklist items.
 */
export async function importSingleProjectJSON(jsonString: string): Promise<any> {
  const parsed = JSON.parse(jsonString);

  // Extract single project if nested inside workspace object
  const projData = parsed.projects && Array.isArray(parsed.projects) ? parsed.projects[0] : parsed;

  if (!projData || typeof projData !== "object" || (!projData.name && !projData.title)) {
    throw new Error("Invalid project JSON: missing project name.");
  }

  const projName = projData.name || projData.title || "Imported Project";
  const projDesc = projData.description || "";
  const projColor = projData.color || "#6366F1";
  const projIcon = projData.icon || "📌";

  // 1. Create project (Backend automatically creates default columns: Todo, In Progress, Done)
  const createdProj = await projectsService.createProject({
    name: projName,
    description: projDesc,
    color: projColor,
    icon: projIcon,
    status: projData.status || "active",
    is_pinned: projData.is_pinned || false,
  });

  // 2. Fetch full created project to map generated column IDs
  const fullProj = await projectsService.getProject(createdProj.id);
  const existingColsMap = new Map<string, any>();
  if (Array.isArray(fullProj.columns)) {
    fullProj.columns.forEach((c: any) => {
      existingColsMap.set(c.name.toLowerCase().trim(), c);
    });
  }

  // 3. Process Columns and Tasks from JSON payload
  if (Array.isArray(projData.columns)) {
    for (const col of projData.columns) {
      const colNameClean = (col.name || col.title || "Column").toLowerCase().trim();
      let colId: string;

      if (existingColsMap.has(colNameClean)) {
        colId = existingColsMap.get(colNameClean).id;
      } else {
        const newCol = await columnsService.createColumn(createdProj.id, {
          name: col.name || col.title || "Column",
          color: col.color || "#6B7280",
        });
        colId = newCol.id;
      }

      // Create tasks inside this column
      if (Array.isArray(col.tasks)) {
        for (const task of col.tasks) {
          const createdTask = await tasksService.createTask(createdProj.id, {
            column_id: colId,
            title: task.title,
            description: task.description || "",
            priority: task.priority || "medium",
            due_date: task.due_date,
            tags: task.tags || (task.labels ? task.labels.map((l: any) => l.name) : undefined),
          });

          // Create checklist items if present
          const checklist = task.checklist_items || task.checklist || [];
          if (Array.isArray(checklist)) {
            for (const item of checklist) {
              const itemTitle = typeof item === "string" ? item : item.title || item.text;
              if (itemTitle) {
                const createdItem = await tasksService.addChecklistItem(createdTask.id, itemTitle);
                if (typeof item === "object" && (item.is_completed || item.done)) {
                  await tasksService.updateChecklistItem(createdItem.id, { is_completed: true });
                }
              }
            }
          }
        }
      }
    }
  }

  return createdProj;
}

/**
 * Validates and restores a full workspace JSON payload.
 */
export async function importFullWorkspaceJSON(jsonString: string): Promise<{ success: boolean; projectCount: number; taskCount: number }> {
  try {
    const data: WorkspaceBackupPayload = JSON.parse(jsonString);

    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error("Invalid backup format: missing projects array.");
    }

    // 1. Restore Tag Categories & Tags
    if (Array.isArray(data.categories)) {
      data.categories.forEach((cat) => saveGlobalCategory(cat));
    }
    if (Array.isArray(data.tags)) {
      data.tags.forEach((t) => saveGlobalTag(t));
    }

    let restoredProjectsCount = 0;

    // 2. Restore Projects via importSingleProjectJSON
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

/**
 * Permanently deletes all projects from backend/storage.
 */
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
