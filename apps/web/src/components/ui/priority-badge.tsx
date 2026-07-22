"use client";

import { getPriorityConfig } from "@/lib/helpers";

interface PriorityBadgeProps {
  priority?: string;
  showDot?: boolean;
  className?: string;
}

export function PriorityBadge({ priority, showDot = true, className = "" }: PriorityBadgeProps) {
  const config = getPriorityConfig(priority);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[11px] font-medium border border-white/6 ${className}`}
      style={{ backgroundColor: config.bgSubtle, color: config.color }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 shadow-accent-glow"
          style={{ backgroundColor: config.color }}
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
