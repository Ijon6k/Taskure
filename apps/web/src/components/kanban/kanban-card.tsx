"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskData } from "@/lib/api";

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
  const completedChecklist = checklistItems.filter((i) => i.is_completed).length;
  const checklistPercent =
    checklistItems.length > 0
      ? Math.round((completedChecklist / checklistItems.length) * 100)
      : 0;

  const priorityColors: Record<string, string> = {
    urgent: "#F6685E",
    high: "#F6AD8A",
    medium: "#7F9CF5",
    low: "#8A8F98",
  };

  const dotColor = priorityColors[task.priority] || "#8A8F98";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="w-full p-3 bg-[#0C0C0C] border border-white/6 hover:border-white/20 rounded-[6px] cursor-grab active:cursor-grabbing transition-colors space-y-2.5 select-none group"
    >
      {/* Top Meta: Category / Tag & Priority Dot */}
      <div className="flex items-center justify-between">
        <span className="px-1.5 py-0.5 rounded-[4px] bg-[#7F9CF5]/10 text-[#7F9CF5] text-[11px] font-medium">
          {task.status === "in_progress" ? "In Progress" : task.status === "done" ? "Done" : "Task"}
        </span>

        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
      </div>

      {/* Title */}
      <h4 className="text-[14px] font-normal text-[#F0F0F0]/90 group-hover:text-[#F0F0F0] leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Progress Bar (if checklist exists) */}
      {checklistItems.length > 0 && (
        <div className="w-full h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#68D391] rounded-full transition-all duration-300"
            style={{ width: `${checklistPercent}%` }}
          />
        </div>
      )}

      {/* Footer Details: Checklist ratio & Due date */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[#787878] pt-1">
        <span>
          {checklistItems.length > 0
            ? `${completedChecklist}/${checklistItems.length}`
            : ""}
        </span>

        <span>
          {task.due_date
            ? new Date(task.due_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </span>
      </div>
    </div>
  );
}
