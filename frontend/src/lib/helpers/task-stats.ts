import { ColumnData, TaskData, ChecklistItemData } from "../api";

export function calculateProgress(completed: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

export interface ColumnStat {
  id: string;
  name: string;
  color: string;
  taskCount: number;
  isDone: boolean;
}

export interface TaskStats {
  allTasks: TaskData[];
  completedTasks: TaskData[];
  completionPercent: number;
  backlogCount: number;
  inProgressCount: number;
  reviewCount: number;
  doneCount: number;
  columnStats: ColumnStat[];
  totalSubtasks: number;
  completedSubtasks: number;
}

export function computeTaskStats(columns: ColumnData[] = []): TaskStats {
  const safeColumns = Array.isArray(columns) ? columns : [];
  
  const allTasks: TaskData[] = safeColumns.flatMap((col) =>
    (col.tasks || []).map((t) => ({
      ...t,
      status: t.status || col.name.toLowerCase().replace(/\s+/g, "_"),
    }))
  );

  let backlogCount = 0;
  let inProgressCount = 0;
  let reviewCount = 0;
  let doneCount = 0;

  const completedTasks: TaskData[] = [];
  const columnStats: ColumnStat[] = [];

  safeColumns.forEach((col, index) => {
    const normName = col.name.toLowerCase().replace(/[-_]/g, " ").trim();
    const tasksInCol = col.tasks || [];

    const isDoneCol =
      normName.includes("done") ||
      normName.includes("complete") ||
      normName.includes("finish") ||
      normName.includes("closed") ||
      normName.includes("shipped") ||
      normName.includes("deploy") ||
      (safeColumns.length > 1 && index === safeColumns.length - 1);

    const isReviewCol =
      !isDoneCol &&
      (normName.includes("review") ||
        normName.includes("test") ||
        normName.includes("qa") ||
        normName.includes("verify") ||
        normName.includes("audit"));

    const isInProgressCol =
      !isDoneCol &&
      !isReviewCol &&
      (normName.includes("progress") ||
        normName.includes("doing") ||
        normName.includes("work") ||
        normName.includes("dev") ||
        normName.includes("wip") ||
        normName.includes("active"));

    const isBacklogCol =
      !isDoneCol &&
      !isReviewCol &&
      !isInProgressCol;

    if (isDoneCol) {
      doneCount += tasksInCol.length;
      completedTasks.push(...tasksInCol);
    } else if (isReviewCol) {
      reviewCount += tasksInCol.length;
    } else if (isInProgressCol) {
      inProgressCount += tasksInCol.length;
    } else {
      backlogCount += tasksInCol.length;
    }

    columnStats.push({
      id: col.id,
      name: col.name,
      color: col.color || "#7F9CF5",
      taskCount: tasksInCol.length,
      isDone: isDoneCol,
    });
  });

  const completionPercent = calculateProgress(completedTasks.length, allTasks.length);

  let totalSubtasks = 0;
  let completedSubtasks = 0;

  for (const task of allTasks) {
    const items = task.checklist_items || (task as any).subtasks;
    if (Array.isArray(items)) {
      totalSubtasks += items.length;
      completedSubtasks += items.filter((st: ChecklistItemData | any) => st.is_completed).length;
    }
  }

  return {
    allTasks,
    completedTasks,
    completionPercent,
    backlogCount,
    inProgressCount,
    reviewCount,
    doneCount,
    columnStats,
    totalSubtasks,
    completedSubtasks,
  };
}
