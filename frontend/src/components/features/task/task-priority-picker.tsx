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
      <div className="text-[12px] font-mono font-medium text-theme-tertiary uppercase tracking-wider">
        Priority
      </div>
      <div className="flex items-center gap-2 pt-1">
        {priorityList.map((p) => {
          const isSelected = (priority || "medium").toLowerCase() === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!isEditing}
              onClick={() => isEditing && onChange(p.id)}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all cursor-pointer ${
                isSelected
                  ? "text-slate-950 font-semibold shadow-xs"
                  : "bg-surface-l3 hover:bg-surface-l4 text-theme-secondary opacity-75 hover:opacity-100"
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
