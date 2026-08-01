"use client";

import { PRIORITIES } from "@/lib/helpers";
import { RankInsigniaIcon } from "@/components/ui/display/priority-badge";

interface TaskPriorityPickerProps {
  priority: string;
  isEditing?: boolean;
  compact?: boolean;
  onChange: (priority: string) => void;
}

export function TaskPriorityPicker({
  priority,
  isEditing = true,
  compact = false,
  onChange,
}: TaskPriorityPickerProps) {
  const priorityList = Object.values(PRIORITIES);
  const currentPriority = (priority || "none").toLowerCase();

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {priorityList.map((p) => {
          const isSelected = currentPriority === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!isEditing}
              onClick={() => isEditing && onChange(p.id)}
              title={`Priority: ${p.label}`}
              className={`h-6 px-2 rounded-[6px] text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer ${
                isSelected
                  ? "bg-theme-elevated text-theme-primary ring-1 ring-theme-default shadow-xs font-semibold"
                  : "bg-surface-l2 hover:bg-surface-l3 text-theme-tertiary hover:text-theme-secondary opacity-75 hover:opacity-100"
              }`}
              style={{
                color: p.id !== "none" ? p.color : undefined,
              }}
            >
              {p.id !== "none" && <RankInsigniaIcon priority={p.id} className="w-3.5 h-3.5 shrink-0" />}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[12px] font-mono font-medium text-theme-tertiary uppercase tracking-wider">
        Priority
      </div>
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {priorityList.map((p) => {
          const isSelected = currentPriority === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!isEditing}
              onClick={() => isEditing && onChange(p.id)}
              className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? "bg-theme-elevated text-theme-primary font-semibold ring-1 ring-theme-default shadow-xs"
                  : "bg-surface-l3 hover:bg-surface-l4 text-theme-secondary opacity-75 hover:opacity-100"
              }`}
              style={{
                color: p.id !== "none" ? p.color : undefined,
              }}
            >
              {p.id !== "none" && <RankInsigniaIcon priority={p.id} className="w-3.5 h-3.5 shrink-0" />}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
