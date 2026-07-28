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
      status: t.status || (col.behavior === "completed" ? "done" : "in_progress"),
    }))
  );

  let inProgressCount = 0;
  let doneCount = 0;

  const completedTasks: TaskData[] = [];
  const columnStats: ColumnStat[] = [];

  safeColumns.forEach((col) => {
    const tasksInCol = col.tasks || [];
    const isDoneCol = col.behavior === "completed";

    if (isDoneCol) {
      doneCount += tasksInCol.length;
      completedTasks.push(...tasksInCol);
    } else {
      inProgressCount += tasksInCol.length;
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
    backlogCount: 0,
    inProgressCount,
    reviewCount: 0,
    doneCount,
    columnStats,
    totalSubtasks,
    completedSubtasks,
  };
}
