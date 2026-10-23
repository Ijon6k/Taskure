"use client";

import { memo, useMemo, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Paperclip, CheckSquare } from "lucide-react";
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

  const shortId = useMemo(() => {
    if (!task.id) return "";
    const clean = task.id.replace(/-/g, "");
    return `TSK-${clean.slice(0, 4).toUpperCase()}`;
  }, [task.id]);

  return (
    <div className="w-full p-2.5 md:p-3 bg-surface-l3 rounded-[6px] border border-theme-subtle hover:border-theme-default hover:bg-[#1c1d20] shadow-elevation-l3 transition-all duration-120 space-y-2 select-none group cursor-pointer">
      {/* Top Header: Linear Task Key (Left) vs Priority Signal Badge (Right) */}
      <div className="flex items-center justify-between gap-2 min-h-[18px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-mono text-theme-tertiary tracking-wider group-hover:text-theme-secondary transition-colors shrink-0">
            {shortId}
          </span>
          <TaskCardTagText tags={tags} />
        </div>
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Task Title (Compact 13px Linear style) */}
      <h4 className="text-[13px] font-medium text-theme-primary transition-colors leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Subtasks Progress Bar (thin hairline) */}
      {checklistItems.length > 0 && (
        <ProgressBar percent={checklistPercent} />
      )}

      {/* Card Footer Details */}
      {(checklistItems.length > 0 || attachmentCount > 0 || task.due_date) && (
        <div className="flex items-center justify-between text-[11px] font-mono text-theme-tertiary pt-0.5">
          <div className="flex items-center gap-2">
            {checklistItems.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="w-3 h-3 stroke-[1.5]" />
                <span>
                  {completedChecklist}/{checklistItems.length}
                </span>
              </span>
            )}

            {attachmentCount > 0 && (
              <div
                className="flex items-center gap-1 text-[11px] text-theme-tertiary/90 hover:text-theme-secondary transition-colors"
                title={`${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}`}
              >
                <Paperclip className="w-3 h-3 stroke-[1.5]" />
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
      className="cursor-grab active:cursor-grabbing transition-all duration-120 active:scale-[0.99]"
    >
      <KanbanCardView task={task} />
    </div>
  );
}
