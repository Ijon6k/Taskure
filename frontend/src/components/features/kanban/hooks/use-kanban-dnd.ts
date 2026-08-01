"use client";

import { useState, useMemo, useEffect } from "react";
import {
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { ColumnData, TaskData, api } from "@/lib/api";
import { computeOptimisticTaskMove } from "@/lib/helpers/kanban-optimistic";
import { toast } from "sonner";

interface UseKanbanDndOptions {
  columns: ColumnData[];
  setColumns: React.Dispatch<React.SetStateAction<ColumnData[]>>;
  onRefreshProject?: (() => void) | undefined;
}


export function useKanbanDnd({
  columns,
  setColumns,
  onRefreshProject,
}: UseKanbanDndOptions) {
  const [activeTask, setActiveTask] = useState<TaskData | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } });

  // Disable DnD on mobile view (<768px) so swiping left/right & scrolling is 100% native and smooth
  const sensors = useSensors(...(isMobile ? [] : [pointerSensor, touchSensor]));

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === "column") {
      setActiveColumnId(active.id as string);
    } else {
      const task = activeData?.task as TaskData;
      if (task) {
        setActiveTask(task);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumnId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // 1. Drop on Trash Zone
    if (overId === "trash-drop-zone") {
      const task = active.data.current?.task as TaskData;
      if (task) {
        try {
          await api.deleteTask(task.id);
          toast.success(`Task "${task.title}" deleted`);
          onRefreshProject?.();
        } catch {
          toast.error("Failed to delete task.");
        }
      }
      return;
    }

    const activeType = active.data.current?.type;

    // 2. Column Drag & Reorder
    if (activeType === "column") {
      if (activeId !== overId) {
        const oldIdx = columns.findIndex((c) => c.id === activeId);
        const newIdx = columns.findIndex((c) => c.id === overId);
        const newCols = arrayMove(columns, oldIdx, newIdx);

        setColumns(newCols);

        try {
          await Promise.all(
            newCols.map((c, idx) =>
              api.updateColumn(c.id, { position: idx })
            )
          );
          onRefreshProject?.();
        } catch {
          toast.error("Failed to reorder columns.");
        }
      }
      return;
    }

    // 3. Task Drag & Move
    const activeTaskData = active.data.current?.task as TaskData;
    if (!activeTaskData) return;

    const sourceColId = activeTaskData.column_id;
    let targetColId = sourceColId;
    let targetTaskPosition = 0;

    const overData = over.data.current;

    if (overData?.type === "column") {
      targetColId = overData.column.id;
      const targetCol = columns.find((c) => c.id === targetColId);
      targetTaskPosition = targetCol?.tasks?.length || 0;
    } else if (overData?.task) {
      const overTask = overData.task as TaskData;
      targetColId = overTask.column_id;
      const targetCol = columns.find((c) => c.id === targetColId);
      const overIdx = targetCol?.tasks?.findIndex((t) => t.id === overTask.id) ?? 0;
      targetTaskPosition = overIdx;
    }

    if (sourceColId === targetColId && activeId === overId) {
      return;
    }

    const targetCol = columns.find((c) => c.id === targetColId);
    let newStatus = activeTaskData.status;
    if (targetCol?.behavior === "completed") {
      newStatus = "done";
    } else if (newStatus === "done") {
      newStatus = "todo";
    }

    // Modular Optimistic UI Update
    setColumns((prevCols) =>
      computeOptimisticTaskMove(prevCols, {
        activeId,
        overId,
        sourceColId,
        targetColId,
        targetTaskPosition,
        activeTaskData,
        newStatus: newStatus as TaskData["status"],
      })
    );

    try {
      await api.moveTask(activeTaskData.id, {
        column_id: targetColId,
        position: targetTaskPosition,
        status: newStatus,
      });

      onRefreshProject?.();
    } catch (e) {
      toast.error("Failed to move task: " + (e as Error).message);
      onRefreshProject?.();
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setActiveColumnId(null);
  };

  return {
    sensors,
    activeTask,
    activeColumnId,
    columnIds,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
