"use client";

import { getPriorityConfig } from "@/lib/helpers";
import { Flame, CaretDoubleUp, CaretUp, Minus } from "@phosphor-icons/react";

interface PriorityBadgeProps {
  priority?: string;
  showLabel?: boolean;
  className?: string;
}

export function RankInsigniaIcon({ priority, className = "w-3.5 h-3.5" }: { priority?: string; className?: string }) {
  const p = (priority || "none").toLowerCase().trim();
  switch (p) {
    case "urgent":
    case "critical":
      return <Flame className={className} weight="fill" />;
    case "high":
      return <CaretDoubleUp className={className} weight="bold" />;
    case "medium":
      return <CaretUp className={className} weight="bold" />;
    case "low":
      return <Minus className={className} weight="bold" />;
    default:
      return null;
  }
}

export function PriorityBadge({ priority, showLabel = false, className = "" }: PriorityBadgeProps) {
  const config = getPriorityConfig(priority);

  if (config.id === "none") {
    return null;
  }

  return (
    <span
      title={`Priority: ${config.label}`}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold select-none shrink-0 ${className}`}
      style={{ color: config.color }}
    >
      <RankInsigniaIcon priority={config.id} className="w-3.5 h-3.5 shrink-0" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
