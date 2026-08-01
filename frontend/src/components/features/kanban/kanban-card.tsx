"use client";

import { memo, useMemo, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Paperclip } from "lucide-react";
import { TaskData, ChecklistItemData } from "@/lib/api";
import { calculateProgress } from "@/lib/helpers";
import { extractTaskTags } from "@/lib/tags";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DueDateText } from "@/components/ui/due-date-text";
import { TaskCardTagText } from "./task-card-tag-text";

interface KanbanCardViewProps {
  task: TaskData;
}

export const KanbanCardView = memo(function KanbanCardView({ task }: KanbanCardViewProps) {
  const { checklistItems, completedChecklist, checklistPercent, tags, attachmentCount } = useMemo(() => {
    const items = task.checklist_items || [];
    const completed = items.filter((i: ChecklistItemData) => i.is_completed).length;
    const percent = calculateProgress(completed, items.length);
    const extractedTags = extractTaskTags(task);
    const attsCount = task.attachments?.length || 0;
    return {
      checklistItems: items,
      completedChecklist: completed,
      checklistPercent: percent,
      tags: extractedTags,
      attachmentCount: attsCount,
    };
  }, [task]);

  return (
    <div className="w-full p-4 bg-surface-l3 rounded-md shadow-elevation-l3 hover:shadow-elevation-hover hover:bg-surface-hover transition-all duration-150 space-y-3 select-none group">
      {/* Top Header: Priority Badge (Left) vs Text-Only Tag (Right) */}
      <div className="flex items-center justify-between gap-2 min-h-[22px]">
        <PriorityBadge priority={task.priority} />
        <TaskCardTagText tags={tags} />
      </div>

      {/* Task Title (Visually Dominant) */}
      <h4 className="text-[15px] font-normal text-theme-primary transition-colors leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Subtasks Progress Bar */}
      {checklistItems.length > 0 && (
        <ProgressBar percent={checklistPercent} />
      )}

      {/* Card Footer Details */}
      {(checklistItems.length > 0 || attachmentCount > 0 || task.due_date) && (
        <div className="flex items-center justify-between text-[12px] font-mono text-theme-tertiary pt-0.5">
          <div className="flex items-center gap-2.5">
            {checklistItems.length > 0 && (
              <span>
                {completedChecklist}/{checklistItems.length} subtasks
              </span>
            )}

            {attachmentCount > 0 && (
              <div
                className="flex items-center gap-1 text-[11px] text-theme-tertiary/90 hover:text-theme-secondary transition-colors"
                title={`${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}`}
              >
                <Paperclip className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>{attachmentCount}</span>
              </div>
            )}
          </div>

          <DueDateText dateStr={task.due_date} />
        </div>
      )}
    </div>
  );
});

interface SortableKanbanCardProps {
  task: TaskData;
  onTaskClick: (task: TaskData) => void;
}

export function SortableKanbanCard({ task, onTaskClick }: SortableKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const handleClick = useCallback(() => onTaskClick(task), [onTaskClick, task]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      data-task-id={task.id}
      className="cursor-grab active:cursor-grabbing transition-all duration-150 active:scale-[0.99]"
    >
      <KanbanCardView task={task} />
    </div>
  );
}
