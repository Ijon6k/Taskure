"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { ColumnData, TaskData, useMoveTask, useCreateTask } from "@/lib/api";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";

interface KanbanBoardProps {
  projectId: string;
  columns: ColumnData[];
  onTaskClick: (task: TaskData) => void;
  onRefreshProject?: () => void;
}

export function KanbanBoard({ projectId, columns, onTaskClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskData | null>(null);
  const moveTaskMutation = useMoveTask(projectId);
  const createTaskMutation = useCreateTask(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as TaskData;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;

    let targetColumnId = "";
    if (over.data.current?.column) {
      targetColumnId = over.data.current.column.id;
    } else if (over.data.current?.task) {
      targetColumnId = over.data.current.task.column_id;
    }

    if (!targetColumnId) return;

    moveTaskMutation.mutate({
      id: taskId,
      data: {
        column_id: targetColumnId,
        position: 0,
      },
    });
  };

  const handleQuickAddTask = (columnId: string) => {
    const title = prompt("Masukkan judul task baru:");
    if (!title || !title.trim()) return;

    createTaskMutation.mutate({
      title: title.trim(),
      column_id: columnId,
    });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex gap-4 overflow-x-auto p-6 items-start h-full select-none">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={col.tasks || []}
            onTaskClick={onTaskClick}
            onAddTask={handleQuickAddTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} onClick={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
