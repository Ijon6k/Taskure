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
      className={`flex items-center gap-1 ${className}`}
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
            className={`px-2.5 py-1 rounded text-xs font-medium capitalize cursor-pointer transition-all duration-150 active:scale-[0.97] ${
              isActive
                ? "bg-theme-elevated text-theme-primary"
                : "text-theme-secondary hover:text-theme-primary hover:bg-theme-hover"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
