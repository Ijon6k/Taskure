"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskData, ChecklistItemData, LabelData } from "@/lib/api";
import { getPriorityConfig, calculateProgress, formatDateShort } from "@/lib/helpers";
import { ProgressBar } from "@/components/ui/progress-bar";

interface KanbanCardProps {
  task: TaskData;
  onClick: () => void;
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
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
  const priorityConfig = getPriorityConfig(task.priority);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="w-full p-3.5 bg-theme-elevated border border-theme-default hover:border-accent rounded-[8px] cursor-grab active:cursor-grabbing transition-all space-y-2.5 select-none group shadow-xs"
    >
      {/* Top Meta: Category / Tag & Priority Dot */}
      <div className="flex items-center justify-between">
        <span className="px-2 py-0.5 rounded-[4px] bg-accent-subtle text-accent text-[12px] font-medium border border-brand-accent/20">
          {task.status === "in_progress" ? "In Progress" : task.status === "done" ? "Done" : "Task"}
        </span>

        <span
          className="w-2 h-2 rounded-full shrink-0 shadow-accent-glow"
          style={{ backgroundColor: priorityConfig.color }}
        />
      </div>

      {/* Title (+1 step font size) */}
      <h4 className="text-[15px] font-medium text-theme-primary group-hover:text-brand-accent transition-colors leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Task Labels / Tags */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {task.labels.map((lbl: LabelData | string) => {
            const name = typeof lbl === "string" ? lbl : lbl.name;
            return (
              <span
                key={name}
                className="px-1.5 py-0.5 rounded-[4px] bg-theme-surface text-theme-secondary text-[10px] font-medium border border-theme-subtle"
              >
                {name}
              </span>
            );
          })}
        </div>
      )}

      {/* Progress Bar (if checklist exists) */}
      {checklistItems.length > 0 && (
        <ProgressBar percent={checklistPercent} color="#68D391" />
      )}

      {/* Footer Details: Checklist ratio & Due date */}
      <div className="flex items-center justify-between text-[12px] font-mono text-theme-secondary pt-0.5">
        <span>
          {checklistItems.length > 0
            ? `${completedChecklist}/${checklistItems.length}`
            : ""}
        </span>

        <span>{formatDateShort(task.due_date)}</span>
      </div>
    </div>
  );
}
