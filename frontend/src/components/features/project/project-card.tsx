"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ProjectData, TaskData } from "@/lib/api";
import { useTheme } from "@/components/providers/theme-provider";

interface ProjectCardProps {
  project: ProjectData;
  variant?: "grid" | "compact";
  className?: string;
}

function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export function ProjectCard({
  project,
  variant = "grid",
  className = "",
}: ProjectCardProps) {
  const { getProjectNavUrl } = useTheme();
  const columns = project.columns || [];
  const columnsWithCounts = columns.map((col) => ({
    id: col.id,
    name: col.name,
    color: col.color,
    count: (col.tasks || []).length,
  }));

  const totalTasks = columnsWithCounts.reduce((sum, c) => sum + c.count, 0);
  const projectColor = project.color || "#7F9CF5";
  const lastUpdated = relativeTime(project.updated_at);

  if (variant === "compact") {
    return (
      <Link
        href={getProjectNavUrl(project.id)}
        className="flex items-center justify-between py-2.5 hover:bg-surface-hover/40 transition-colors group"
      >
        <div className="flex items-center gap-2.5 truncate">
          <span
            className="w-2 h-2 shrink-0"
            style={{ backgroundColor: projectColor }}
          />
          <span className="text-[14px] font-medium text-theme-secondary group-hover:text-theme-primary transition-colors truncate">
            {project.name}
          </span>
        </div>
        <span className="text-[12px] text-theme-tertiary shrink-0">
          {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={getProjectNavUrl(project.id)}
      className={`group/card block p-5 bg-surface-l2 rounded-md shadow-elevation-l3 hover:shadow-elevation-hover hover:bg-surface-hover transition-all duration-150 ${className}`}
    >
      {/* Title with color dot */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: projectColor }}
        />
        <h3 className="text-[18px] font-medium text-theme-primary transition-colors truncate">
          {project.name}
        </h3>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-[14px] text-theme-secondary leading-relaxed line-clamp-2 mb-3.5">
          {project.description}
        </p>
      )}

      {/* Thin segmented distribution bar */}
      {totalTasks > 0 && (
        <div className="w-full h-[3px] bg-surface-l1 rounded-full overflow-hidden flex gap-px mb-3.5">
          {columnsWithCounts.map((col) => {
            if (col.count === 0) return null;
            const widthPct = (col.count / totalTasks) * 100;
            return (
              <div
                key={col.id}
                className="h-full"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: col.color || projectColor,
                  opacity: 0.7,
                }}
                title={`${col.name}: ${col.count}`}
              />
            );
          })}
        </div>
      )}

      {/* Footer: task count + last updated */}
      <div className="flex items-center justify-between text-[13px] text-theme-tertiary">
        <span>{totalTasks} {totalTasks === 1 ? "task" : "tasks"}</span>
        {lastUpdated && <span>{lastUpdated}</span>}
      </div>
    </Link>
  );
}
