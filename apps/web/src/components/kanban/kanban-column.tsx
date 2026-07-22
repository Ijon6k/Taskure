"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { ColumnData, TaskData } from "@/lib/api";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  column: ColumnData;
  tasks: TaskData[];
  onTaskClick: (task: TaskData) => void;
  onAddTask: (columnId: string) => void;
}

export function KanbanColumn({ column, tasks, onTaskClick, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { column },
  });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`w-[280px] shrink-0 flex flex-col max-h-full transition-colors rounded-[6px] ${
        isOver ? "bg-white/5" : ""
      }`}
    >
      {/* Column Header */}
      <div className="h-[34px] pb-3 px-0.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: column.color || "#8A8F98" }}
          />
          <h3 className="text-[14px] font-medium text-[#F0F0F0]">{column.name}</h3>
          <span className="px-1.5 bg-[#1A1A1A] text-[#787878] font-mono text-[12px] rounded-[4px]">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Task Stack Container */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-[100px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {/* Add Task Button at bottom of column */}
        <button
          onClick={() => onAddTask(column.id)}
          className="w-full h-[32px] px-3 border border-white/6 rounded-[6px] flex items-center gap-2 text-[#787878] hover:text-[#F0F0F0] hover:bg-[#141414] transition-colors text-[12px] font-medium"
        >
          <Plus className="w-[13px] h-[13px]" />
          <span>Add task</span>
        </button>
      </div>
    </div>
  );
}
