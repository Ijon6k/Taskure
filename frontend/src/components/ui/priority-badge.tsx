"use client";

import { getPriorityConfig } from "@/lib/helpers";

interface PriorityBadgeProps {
  priority?: string;
  showDot?: boolean;
  className?: string;
}

export function PriorityBadge({ priority, showDot = false, className = "" }: PriorityBadgeProps) {
  const config = getPriorityConfig(priority);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[12px] font-medium select-none rounded-full transition-colors shrink-0 ${config.textClass} ${className}`}
      style={{ backgroundColor: config.bgPastel }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: config.color }}
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
