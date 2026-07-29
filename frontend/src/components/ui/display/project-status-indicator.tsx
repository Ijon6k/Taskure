"use client";

import React from "react";

export interface ProjectStatusIndicatorProps {
  status?: string;
  showDot?: boolean;
  className?: string;
}

export function getProjectStatusConfig(status?: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return { dotColor: "bg-emerald-500", textColor: "text-emerald-400" };
    case "paused":
      return { dotColor: "bg-amber-500", textColor: "text-amber-400" };
    case "completed":
      return { dotColor: "bg-blue-500", textColor: "text-blue-400" };
    case "archived":
      return { dotColor: "bg-slate-400", textColor: "text-theme-tertiary" };
    default:
      return { dotColor: "bg-emerald-500", textColor: "text-emerald-400" };
  }
}

export function ProjectStatusIndicator({
  status = "active",
  showDot = true,
  className = "",
}: ProjectStatusIndicatorProps) {
  const { dotColor, textColor } = getProjectStatusConfig(status);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      <span className={`text-xs font-medium capitalize ${textColor}`}>
        {status}
      </span>
    </div>
  );
}
