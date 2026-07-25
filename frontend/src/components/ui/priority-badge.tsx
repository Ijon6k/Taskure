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
    <div
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-normal text-slate-900 select-none border border-black/10 transition-colors shrink-0 ${className}`}
      style={{ backgroundColor: config.bgPastel }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 mr-1.5 opacity-80"
          style={{ backgroundColor: config.color }}
        />
      )}
      <span className="font-normal tracking-wide">{config.label}</span>
    </div>
  );
}
