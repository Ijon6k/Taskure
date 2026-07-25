import { TaskData } from "./api";
import { extractTaskTags } from "./tags";

export interface BoardFilterState {
  searchQuery: string;
  selectedTag: string;
  selectedPriority: string;
  selectedDueDate: string;
  selectedSubtasks: string;
  sortBy: string;
}

export const DEFAULT_BOARD_FILTERS: BoardFilterState = {
  searchQuery: "",
  selectedTag: "all",
  selectedPriority: "all",
  selectedDueDate: "all",
  selectedSubtasks: "all",
  sortBy: "position",
};

export function countActiveFilters(filters: BoardFilterState): number {
  let count = 0;
  if (filters.searchQuery.trim()) count++;
  if (filters.selectedTag !== "all") count++;
  if (filters.selectedPriority !== "all") count++;
  if (filters.selectedDueDate !== "all") count++;
  if (filters.selectedSubtasks !== "all") count++;
  if (filters.sortBy !== "position") count++;
  return count;
}

export function filterAndSortTasks(tasks: TaskData[], filters: BoardFilterState): TaskData[] {
  let result = [...tasks];

  // 1. Search Query
  const q = filters.searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // 2. Tag Filter
  if (filters.selectedTag !== "all") {
    const targetTag = filters.selectedTag.toLowerCase();
    result = result.filter((t) =>
      extractTaskTags(t).some((tag) => tag.toLowerCase() === targetTag)
    );
  }

  // 3. Priority Filter
  if (filters.selectedPriority !== "all") {
    result = result.filter((t) => t.priority === filters.selectedPriority);
  }

  // 4. Due Date Filter
  if (filters.selectedDueDate !== "all") {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const next7DaysEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    result = result.filter((t) => {
      if (filters.selectedDueDate === "no_due_date") return !t.due_date;
      if (!t.due_date) return false;

      const dueDate = new Date(t.due_date);
      if (filters.selectedDueDate === "overdue") {
        return dueDate < todayStart;
      }
      if (filters.selectedDueDate === "today") {
        return dueDate >= todayStart && dueDate <= todayEnd;
      }
      if (filters.selectedDueDate === "this_week") {
        return dueDate >= todayStart && dueDate <= next7DaysEnd;
      }
      return true;
    });
  }

  // 5. Subtasks Filter
  if (filters.selectedSubtasks !== "all") {
    result = result.filter((t) => {
      const items = t.checklist_items || [];
      if (filters.selectedSubtasks === "has_subtasks") return items.length > 0;
      if (filters.selectedSubtasks === "completed") {
        return items.length > 0 && items.every((i) => i.is_completed);
      }
      if (filters.selectedSubtasks === "pending") {
        return items.length > 0 && items.some((i) => !i.is_completed);
      }
      return true;
    });
  }

  // 6. Sorting
  if (filters.sortBy === "due_date") {
    result.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  } else if (filters.sortBy === "priority") {
    const pWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    result.sort((a, b) => (pWeight[b.priority || "medium"] || 2) - (pWeight[a.priority || "medium"] || 2));
  } else if (filters.sortBy === "title") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  } else if (filters.sortBy === "updated") {
    result.sort((a, b) => {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return timeB - timeA;
    });
  } else {
    // Default position order
    result.sort((a, b) => a.position - b.position);
  }

  return result;
}
