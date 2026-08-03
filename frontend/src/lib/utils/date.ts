import { differenceInCalendarDays, isSameYear, format } from "date-fns";

/** Returns today's date label for the dashboard header. */
export function getFormattedDate(): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  return new Date().toLocaleDateString("en-US", options);
}

/** Returns a time-of-day greeting (morning/afternoon/evening). */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Formats a date compactly (e.g. 'Aug 3'). */
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

/** Formats a date as a full, human-readable string (e.g. 'Mon, Aug 3, 2026'). */
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

export interface FormattedDueDate {
  text: string;
  colorClass: string;
}

/**
 * Formats due dates adaptively across all views using date-fns and semantic color tokens.
 * - Overdue (diff < 0): "Overdue 3d" -> text-semantic-danger
 * - Today (diff == 0): "Today" -> text-semantic-danger
 * - Tomorrow (diff == 1): "Tomorrow" -> text-semantic-warning
 * - 2 to 6 days: "In 2d", "In 3d", "In 6d" -> text-semantic-warning
 * - 7+ days (same year): "Jul 31" -> text-theme-tertiary
 * - 7+ days (different year): "Jul 31, 2027" -> text-theme-tertiary
 */
/** Formats a due date relative to today: 'Today', 'Tomorrow', 'Overdue' or a short date. */
export function getFormattedDueDate(
  dateStr?: string | null | undefined
): FormattedDueDate | null {
  if (!dateStr) return null;
  try {
    const due = new Date(dateStr);
    if (isNaN(due.getTime())) return null;

    const today = new Date();
    const diff = differenceInCalendarDays(due, today);

    if (diff < 0) {
      const overdueDays = Math.abs(diff);
      return {
        text: `Overdue ${overdueDays}d`,
        colorClass: "text-semantic-danger",
      };
    }

    if (diff === 0) {
      return {
        text: "Today",
        colorClass: "text-semantic-danger",
      };
    }

    if (diff === 1) {
      return {
        text: "Tomorrow",
        colorClass: "text-semantic-warning",
      };
    }

    if (diff >= 2 && diff <= 6) {
      return {
        text: `In ${diff}d`,
        colorClass: "text-semantic-warning",
      };
    }

    const dateText = isSameYear(due, today)
      ? format(due, "MMM d")
      : format(due, "MMM d, yyyy");

    return {
      text: dateText,
      colorClass: "text-theme-tertiary",
    };
  } catch {
    return null;
  }
}

export interface ProjectUrgencyMetadata {
  taskCountText: string;
  urgencyText: string;
  urgencyColorClass: string;
}

/**
 * Computes single highest-priority urgency signal for Project Card metadata footer:
 * Priority: 1. Overdue -> 2. Due Today -> 3. Tomorrow -> 4. Upcoming (In 2-6d) -> 5. Future (7+d) -> 6. Last Updated
 */
/** Ranks a project's freshness for the dashboard (based on updated_at age). */
export function computeProjectUrgency(
  tasks: Array<{ due_date?: string | null; updated_at?: string }>,
  projectUpdatedAt?: string
): ProjectUrgencyMetadata {
  const taskCount = tasks.length;
  const taskCountText = `${taskCount} ${taskCount === 1 ? "Task" : "Tasks"}`;

  const today = new Date();

  const datedTasks = tasks
    .filter((t) => t.due_date)
    .map((t) => {
      const due = new Date(t.due_date!);
      const diff = differenceInCalendarDays(due, today);
      return { due, diff };
    })
    .filter((t) => !isNaN(t.due.getTime()));

  // 1. Overdue
  const overdueTasks = datedTasks.filter((t) => t.diff < 0);
  if (overdueTasks.length > 0) {
    const count = overdueTasks.length;
    return {
      taskCountText,
      urgencyText: `${count} Overdue`,
      urgencyColorClass: "text-semantic-danger",
    };
  }

  // 2. Due Today
  const dueTodayTasks = datedTasks.filter((t) => t.diff === 0);
  if (dueTodayTasks.length > 0) {
    return {
      taskCountText,
      urgencyText: "Due Today",
      urgencyColorClass: "text-semantic-warning",
    };
  }

  // 3. Due Tomorrow
  const dueTomorrowTasks = datedTasks.filter((t) => t.diff === 1);
  if (dueTomorrowTasks.length > 0) {
    return {
      taskCountText,
      urgencyText: "Tomorrow",
      urgencyColorClass: "text-semantic-warning",
    };
  }

  // 4. Upcoming within 7 days (2..6 days)
  const upcomingTasks = datedTasks
    .filter((t) => t.diff >= 2 && t.diff <= 6)
    .sort((a, b) => a.diff - b.diff);

  if (upcomingTasks.length > 0 && upcomingTasks[0]) {
    const minDiff = upcomingTasks[0].diff;
    return {
      taskCountText,
      urgencyText: `In ${minDiff}d`,
      urgencyColorClass: "text-semantic-warning",
    };
  }

  // 5. Project deadline (7+ days)
  const futureTasks = datedTasks
    .filter((t) => t.diff >= 7)
    .sort((a, b) => a.diff - b.diff);

  if (futureTasks.length > 0 && futureTasks[0]) {
    const nearest = futureTasks[0].due;
    const dateText = isSameYear(nearest, today)
      ? format(nearest, "MMM d")
      : format(nearest, "MMM d, yyyy");
    return {
      taskCountText,
      urgencyText: dateText,
      urgencyColorClass: "text-theme-tertiary",
    };
  }

  // 6. Last updated fallback
  const firstTask = tasks[0];
  const lastUpdatedDateStr = projectUpdatedAt || (firstTask ? firstTask.updated_at : null);

  if (lastUpdatedDateStr) {
    const updatedDate = new Date(lastUpdatedDateStr);
    if (!isNaN(updatedDate.getTime())) {
      const diff = differenceInCalendarDays(today, updatedDate);
      let updatedText = "Updated Recently";
      if (diff === 0) updatedText = "Updated Today";
      else if (diff === 1) updatedText = "Updated Yesterday";
      else if (diff > 1 && diff <= 30) updatedText = `Updated ${diff}d ago`;
      else updatedText = `Updated ${format(updatedDate, "MMM d")}`;

      return {
        taskCountText,
        urgencyText: updatedText,
        urgencyColorClass: "text-theme-tertiary",
      };
    }
  }

  return {
    taskCountText,
    urgencyText: "No Due Date",
    urgencyColorClass: "text-theme-tertiary",
  };
}

