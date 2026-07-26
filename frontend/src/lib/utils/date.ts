import { differenceInCalendarDays, isSameYear, format } from "date-fns";

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
