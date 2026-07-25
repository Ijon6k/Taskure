"use client";

import { PRIORITIES } from "@/lib/helpers";

interface TaskPriorityPickerProps {
  priority: string;
  isEditing: boolean;
  onChange: (priority: string) => void;
}

export function TaskPriorityPicker({ priority, isEditing, onChange }: TaskPriorityPickerProps) {
  const priorityList = Object.values(PRIORITIES);

  return (
    <div className="space-y-1.5">
      <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
        Priority
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        {priorityList.map((p) => {
          const isSelected = (priority || "medium").toLowerCase() === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!isEditing}
              onClick={() => isEditing && onChange(p.id)}
              className={`px-3 py-1 rounded-[6px] text-[13px] font-normal transition-all ${
                isSelected
                  ? "text-slate-900 border border-black/10 shadow-sm"
                  : "bg-theme-surface/50 border border-transparent opacity-60 hover:opacity-100 text-theme-secondary"
              }`}
              style={{
                backgroundColor: isSelected ? p.bgPastel : undefined,
              }}
            >
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
