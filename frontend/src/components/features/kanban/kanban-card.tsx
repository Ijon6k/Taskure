"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskData, ChecklistItemData, LabelData } from "@/lib/api";
import { getPriorityConfig, calculateProgress, formatDateShort } from "@/lib/helpers";
import { getTagConfig } from "@/lib/tags";
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

  const labels = task.labels || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="w-full p-3.5 bg-theme-elevated border border-theme-default hover:border-accent/40 hover:bg-theme-hover rounded-[8px] cursor-grab active:cursor-grabbing transition-colors duration-150 active:scale-[0.99] space-y-2.5 select-none group shadow-xs"
    >
      {/* Top Header: Tag Chips & Priority Indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 items-center min-h-[20px]">
          {labels.length > 0 ? (
            labels.slice(0, 3).map((lbl: LabelData | string) => {
              const name = typeof lbl === "string" ? lbl : lbl.name;
              const color = typeof lbl === "string" ? undefined : lbl.color;
              const tagCfg = getTagConfig(name, color);

              return (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium tracking-tight border"
                  style={{
                    backgroundColor: tagCfg.bgSubtle,
                    color: tagCfg.color,
                    borderColor: tagCfg.borderSubtle,
                  }}
                >
                  {tagCfg.label}
                </span>
              );
            })
          ) : (
            <span
              className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium border"
              style={{
                backgroundColor: priorityConfig.bgSubtle,
                color: priorityConfig.color,
                borderColor: `${priorityConfig.color}33`,
              }}
            >
              {priorityConfig.label} Priority
            </span>
          )}
        </div>

        <span
          className="w-2 h-2 rounded-full shrink-0 shadow-accent-glow"
          style={{ backgroundColor: priorityConfig.color }}
          title={`${priorityConfig.label} priority`}
        />
      </div>

      {/* Task Title */}
      <h4 className="text-[14px] font-medium text-theme-primary group-hover:text-brand-accent transition-colors leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Progress Bar (if subtasks exist) */}
      {checklistItems.length > 0 && (
        <ProgressBar percent={checklistPercent} color="#68D391" />
      )}

      {/* Footer Details: Checklist ratio & Due date */}
      <div className="flex items-center justify-between text-[11px] font-mono text-theme-secondary pt-0.5">
        <span>
          {checklistItems.length > 0
            ? `${completedChecklist}/${checklistItems.length} subtasks`
            : ""}
        </span>

        <span>{formatDateShort(task.due_date)}</span>
      </div>
    </div>
  );
}
