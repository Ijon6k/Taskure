import { ProjectSummaryData, FocusResponse, FocusItem } from "../api/types";

// ─── 5-State Model ────────────────────────────────────────────────────────────
// FRESH   — 0 active projects
// EMPTY   — ≥1 project, 0 tasks across workspace
// ACTIVE  — Hero task available from focus engine
// CLEAR   — Tasks exist but all completed
// PAUSED  — All projects with tasks are excluded from focus (focus_enabled: false)
// ───────────────────────────────────────────────────────────────────────────────

export type WorkspaceStateCode =
  | "FRESH"
  | "ARCHIVED"
  | "EMPTY"
  | "ACTIVE"
  | "CLEAR"
  | "PAUSED";

export interface WorkspaceStateEvaluation {
  code: WorkspaceStateCode;
  hero: FocusItem | null;
  activeProjectsCount: number;
}

/** Derives the aggregated workspace state (counts by status) from the project list. */
export function deriveWorkspaceState(
  projects: ProjectSummaryData[] = [],
  focusResp?: FocusResponse | null
): WorkspaceStateEvaluation {
  // Backend is the single source of truth — use preprocessed backend state directly
  if (focusResp && focusResp.state_code) {
    return {
      code: focusResp.state_code,
      hero: focusResp.hero || null,
      activeProjectsCount: focusResp.active_projects_count ?? projects.length,
    };
  }

  const activeCount = projects.filter((p) => !p.is_archived && p.status !== "archived").length;

  let code: WorkspaceStateCode = "FRESH";
  if (activeCount > 0) {
    code = "EMPTY";
  } else if (projects.length > 0) {
    code = "ARCHIVED";
  }

  return {
    code,
    hero: null,
    activeProjectsCount: activeCount,
  };
}
