import { ColumnData, TaskData } from "@/lib/api";
import { arrayMove } from "@dnd-kit/sortable";

export interface MoveTaskOptimisticParams {
  activeId: string;
  overId: string;
  sourceColId: string;
  targetColId: string;
  targetTaskPosition: number;
  activeTaskData: TaskData;
  newStatus: TaskData["status"];
}

/**
 * Pure function to compute the new columns array state when a task is dragged optimistically.
 */
export function computeOptimisticTaskMove(
  columns: ColumnData[],
  params: MoveTaskOptimisticParams
): ColumnData[] {
  const {
    activeId,
    overId,
    sourceColId,
    targetColId,
    targetTaskPosition,
    activeTaskData,
    newStatus,
  } = params;

  return columns.map((col) => {
    // 1. Moving within the same column
    if (col.id === sourceColId && sourceColId === targetColId) {
      const tasks = [...(col.tasks || [])];
      const oldIdx = tasks.findIndex((t) => t.id === activeId);
      const newIdx = tasks.findIndex((t) => t.id === overId);
      if (oldIdx !== -1 && newIdx !== -1) {
        return { ...col, tasks: arrayMove(tasks, oldIdx, newIdx) };
      }
      return col;
    }

    // 2. Removing task from source column
    if (col.id === sourceColId) {
      return {
        ...col,
        tasks: (col.tasks || []).filter((t) => t.id !== activeId),
      };
    }

    // 3. Inserting task into target column
    if (col.id === targetColId) {
      const tasks = [...(col.tasks || [])];
      const movedTask: TaskData = {
        ...activeTaskData,
        column_id: targetColId,
        status: newStatus,
      };
      tasks.splice(targetTaskPosition, 0, movedTask);
      return { ...col, tasks };
    }

    return col;
  });
}
