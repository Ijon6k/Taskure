import { saveGlobalCategory, saveGlobalTag } from "../tags";
import { projectsService } from "../api/services";
import { COUNT_KEYS } from "./constants";
import { parseImportObject } from "./parse";
import type { BoardMutationCounts, ImportApplyResult, ParsedImport, WorkspaceBackupPayload } from "./types";

// ─── Apply: single bulk request per import ──────────────────────────────────

/** Normalizes the API import-count response into a stable shape. */
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

/** Creates a new project from parsed import data via the API. */
export async function applyImportCreate(parsed: ParsedImport): Promise<ImportApplyResult> {
  const result = await projectsService.importProject(parsed);
  return { project: result.project, ...mapImportCounts(result.counts) };
}

/** Replaces an existing project's board with parsed import data. */
export async function applyImportReplace(projectId: string, parsed: ParsedImport): Promise<BoardMutationCounts> {
  const result = await projectsService.importBoard(projectId, parsed);
  return mapImportCounts(result.counts);
}

/** Applies a full workspace import (projects + tags) via the API. */
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
      } catch (err) {
        console.error("Failed to restore project:", proj.name, err);
      }
    }

    return {
      success: true,
      projectCount: restoredProjectsCount,
      taskCount: 0,
    };
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Failed to parse or restore workspace backup JSON.");
  }
}

/** Deletes every project in the workspace (full reset). */
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
