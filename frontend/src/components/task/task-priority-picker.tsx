"use client";

interface TaskPriorityPickerProps {
  priority: string;
  isEditing: boolean;
  onChange: (priority: string) => void;
}

const PRIORITIES = [
  { id: "urgent", label: "Urgent", color: "#F6685E" },
  { id: "high", label: "High", color: "#F6AD8A" },
  { id: "medium", label: "Medium", color: "#7F9CF5" },
  { id: "low", label: "Low", color: "#8A8F98" },
];

export function TaskPriorityPicker({ priority, isEditing, onChange }: TaskPriorityPickerProps) {
  return (
    <div className="space-y-1.5">
      <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
        Priority
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        {PRIORITIES.map((p) => {
          const isSelected = (priority || "medium").toLowerCase() === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!isEditing}
              onClick={() => isEditing && onChange(p.id)}
              className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 transition-all ${
                isSelected
                  ? "bg-theme-elevated border border-white/10 shadow-sm"
                  : "bg-theme-surface/50 border border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span style={{ color: isSelected ? p.color : "inherit" }}>
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
