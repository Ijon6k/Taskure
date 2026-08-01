export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";

export interface PriorityConfig {
  id: string;
  label: string;
  color: string;
  bgPastel: string;
  textClass: string;
}

export const DEFAULT_PRIORITY: PriorityConfig = {
  id: "none",
  label: "None",
  color: "#71717A",
  bgPastel: "rgba(113, 113, 122, 0.12)",
  textClass: "text-theme-secondary",
};

export const PRIORITIES: Record<string, PriorityConfig> = {
  none: DEFAULT_PRIORITY,
  low: {
    id: "low",
    label: "Low",
    color: "#16A34A",
    bgPastel: "#BBF7D0",
    textClass: "text-slate-900",
  },
  medium: {
    id: "medium",
    label: "Medium",
    color: "#3B82F6",
    bgPastel: "#BAE6FD",
    textClass: "text-slate-900",
  },
  high: {
    id: "high",
    label: "High",
    color: "#D97706",
    bgPastel: "#FDE68A",
    textClass: "text-slate-900",
  },
  urgent: {
    id: "urgent",
    label: "Urgent",
    color: "#E11D48",
    bgPastel: "#FCA5A5",
    textClass: "text-slate-900",
  },
};

export function getPriorityConfig(priority?: string): PriorityConfig {
  if (!priority) return DEFAULT_PRIORITY;
  const key = priority.toLowerCase().trim();

  if (key === "" || key === "none" || key === "unset") return PRIORITIES.none ?? DEFAULT_PRIORITY;
  if (key === "critical" || key === "highest" || key === "urgent") return PRIORITIES.urgent ?? DEFAULT_PRIORITY;
  if (key === "high") return PRIORITIES.high ?? DEFAULT_PRIORITY;
  if (key === "normal" || key === "default" || key === "medium") return PRIORITIES.medium ?? DEFAULT_PRIORITY;
  if (key === "minor" || key === "lowest" || key === "low") return PRIORITIES.low ?? DEFAULT_PRIORITY;

  return PRIORITIES[key] ?? DEFAULT_PRIORITY;
}
