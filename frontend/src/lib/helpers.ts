"use client";

import { ColumnData, TaskData, ChecklistItemData } from "./api";

export function getFormattedDate(): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  return new Date().toLocaleDateString("en-US", options);
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export interface PriorityConfig {
  id: string;
  label: string;
  color: string;
  bgPastel: string;
  textClass: string;
}

export const DEFAULT_PRIORITY: PriorityConfig = {
  id: "medium",
  label: "Medium",
  color: "#3B82F6",
  bgPastel: "#BAE6FD",
  textClass: "text-slate-900",
};

export const PRIORITIES: Record<string, PriorityConfig> = {
  urgent: {
    id: "urgent",
    label: "Urgent",
    color: "#E11D48",
    bgPastel: "#FCA5A5",
    textClass: "text-slate-900",
  },
  high: {
    id: "high",
    label: "High",
    color: "#D97706",
    bgPastel: "#FDE68A",
    textClass: "text-slate-900",
  },
  medium: DEFAULT_PRIORITY,
  low: {
    id: "low",
    label: "Low",
    color: "#16A34A",
    bgPastel: "#BBF7D0",
    textClass: "text-slate-900",
  },
};

export function getPriorityConfig(priority?: string): PriorityConfig {
  if (!priority) return DEFAULT_PRIORITY;
  const key = priority.toLowerCase().trim();
  
  if (key === "critical" || key === "highest") return PRIORITIES.urgent ?? DEFAULT_PRIORITY;
  if (key === "normal" || key === "default") return PRIORITIES.medium ?? DEFAULT_PRIORITY;
  if (key === "minor" || key === "lowest") return PRIORITIES.low ?? DEFAULT_PRIORITY;

  return PRIORITIES[key] ?? DEFAULT_PRIORITY;
}

export function calculateProgress(completed: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

export function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateFull(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export interface TaskStats {
  allTasks: TaskData[];
  completedTasks: TaskData[];
  completionPercent: number;
  backlogCount: number;
  inProgressCount: number;
  reviewCount: number;
  doneCount: number;
  totalSubtasks: number;
  completedSubtasks: number;
}

export function computeTaskStats(columns: ColumnData[] = []): TaskStats {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const allTasks: TaskData[] = safeColumns.flatMap((col) => col.tasks || []);
  
  // Find completed tasks (either task status is done or belongs to a 'done' column)
  const completedTasks = allTasks.filter((t) => {
    if (t.status === "done") return true;
    const parentCol = safeColumns.find((c) => c.tasks?.some((ct: TaskData) => ct.id === t.id));
    return parentCol?.name.toLowerCase().includes("done");
  });

  const completionPercent = calculateProgress(completedTasks.length, allTasks.length);

  const getColCount = (nameQuery: string) => {
    const col = safeColumns.find((c) => c.name.toLowerCase().includes(nameQuery.toLowerCase()));
    return col ? (col.tasks || []).length : 0;
  };

  const backlogCount = getColCount("todo") || getColCount("backlog") || 0;
  const inProgressCount = getColCount("progress") || 0;
  const reviewCount = getColCount("review") || 0;
  const doneCount = getColCount("done") || completedTasks.length;

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
    totalSubtasks,
    completedSubtasks,
  };
}
