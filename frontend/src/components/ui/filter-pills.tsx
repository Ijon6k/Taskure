"use client";

export interface FilterOption<T extends string = string> {
  key: T;
  label: string;
}

interface FilterPillsProps<T extends string = string> {
  options: (FilterOption<T> | T)[];
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
}

export function FilterPills<T extends string = string>({
  options,
  activeKey,
  onChange,
  className = "",
}: FilterPillsProps<T>) {
  return (
    <div
      className={`h-[36px] p-1 bg-theme-surface border border-theme-default rounded-[6px] flex items-center gap-1 ${className}`}
    >
      {options.map((opt) => {
        const key = typeof opt === "string" ? opt : opt.key;
        const label = typeof opt === "string" ? opt : opt.label;
        const isActive = activeKey === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key as T)}
            className={`px-2.5 py-1 rounded-[4px] text-[12px] font-medium capitalize transition-colors ${
              isActive
                ? "bg-theme-elevated text-theme-primary"
                : "text-theme-secondary hover:text-theme-primary"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
