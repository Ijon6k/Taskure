"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskData, ChecklistItemData } from "@/lib/api";
import { calculateProgress, formatDateShort } from "@/lib/helpers";
import { extractTaskTags } from "@/lib/tags";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskCardTagText } from "./task-card-tag-text";

interface KanbanCardProps {
  task: TaskData;
  onClick: () => void;
}

export const KanbanCard = memo(function KanbanCard({ task, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const checklistItems = task.checklist_items || [];
  const completedChecklist = checklistItems.filter((i: ChecklistItemData) => i.is_completed).length;
  const checklistPercent = calculateProgress(completedChecklist, checklistItems.length);

  const tags = extractTaskTags(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="w-full p-3 bg-surface-l3 border border-theme-subtle hover:border-theme-default hover:bg-surface-hover rounded-md cursor-grab active:cursor-grabbing transition-all duration-150 active:scale-[0.99] space-y-2.5 select-none group shadow-elevation-l3"
    >
      {/* Top Header: Priority Badge (Left) vs Text-Only Tag (Right) */}
      <div className="flex items-center justify-between gap-2 min-h-[22px]">
        <PriorityBadge priority={task.priority} />
        <TaskCardTagText tags={tags} />
      </div>

      {/* Task Title (Visually Dominant) */}
      <h4 className="text-[13px] font-medium text-theme-primary group-hover:text-brand-accent transition-colors leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Subtasks Progress Bar */}
      {checklistItems.length > 0 && (
        <ProgressBar percent={checklistPercent} />
      )}

      {/* Card Footer Details */}
      {(checklistItems.length > 0 || task.due_date) && (
        <div className="flex items-center justify-between text-[11px] font-mono text-theme-tertiary pt-0.5">
          <span>
            {checklistItems.length > 0
              ? `${completedChecklist}/${checklistItems.length} subtasks`
              : ""}
          </span>
          <span>{formatDateShort(task.due_date)}</span>
        </div>
      )}
    </div>
  );
}
);
