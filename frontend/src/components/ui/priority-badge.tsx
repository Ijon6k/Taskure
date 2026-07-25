"use client";

import { Badge } from "@/components/ui/badge";
import { getPriorityConfig } from "@/lib/helpers";

interface PriorityBadgeProps {
  priority?: string;
  showDot?: boolean;
  className?: string;
}

export function PriorityBadge({ priority, showDot = true, className = "" }: PriorityBadgeProps) {
  const config = getPriorityConfig(priority);

  const getVariant = (p?: string) => {
    switch (p) {
      case "urgent":
        return "danger";
      case "high":
        return "warning";
      case "low":
        return "success";
      default:
        return "secondary";
    }
  };

  return (
    <Badge variant={getVariant(priority)} className={className}>
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 mr-1"
          style={{ backgroundColor: config.color }}
        />
      )}
      <span>{config.label}</span>
    </Badge>
  );
}
