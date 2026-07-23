"use client";

import Link from "next/link";
import { ProjectData, TaskData } from "@/lib/api";

interface ProjectCardProps {
  project: ProjectData;
  variant?: "grid" | "compact" | "detailed";
  className?: string;
}

export function ProjectCard({
  project,
  variant = "grid",
  className = "",
}: ProjectCardProps) {
  const tasks = project.tasks || [];
  const doneCount = tasks.filter((t: TaskData) => t.status === "done").length;
  const totalCount = tasks.length;
  const percent =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const projectColor = project.color || "#7F9CF5";

  if (variant === "compact") {
    return (
      <Link
        href={`/projects/${project.id}/board`}
        className={`flex items-center justify-between px-2.5 py-2 rounded-[6px] hover:bg-theme-hover cursor-pointer transition-colors duration-150 active:scale-[0.99] group ${className}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: projectColor }}
          />
          <span className="text-[14px] font-medium text-theme-primary/80 group-hover:text-theme-primary truncate">
            {project.name}
          </span>
        </div>
        <span className="text-[12px] font-mono text-theme-secondary shrink-0">
          recently updated
        </span>
      </Link>
    );
  }

  if (variant === "detailed") {
    return (
      <Link
        href={`/projects/${project.id}/board`}
        className={`p-4 bg-theme-surface border border-theme-default hover:border-brand-accent/40 hover:bg-theme-hover rounded-[8px] flex flex-col justify-between space-y-3 cursor-pointer transition-colors duration-150 active:scale-[0.99] group shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: projectColor }}
            />
            <span className="text-[14px] font-medium text-theme-primary group-hover:text-brand-accent transition-colors truncate">
              {project.name}
            </span>
          </div>
        </div>

        {project.description && (
          <p className="text-[12px] text-theme-secondary line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between text-[12px] text-theme-secondary pt-1">
          <span>
            {doneCount}/{totalCount} tasks
          </span>
          <span className="capitalize">{project.status || "active"}</span>
        </div>
      </Link>
    );
  }

  // Default "grid" variant
  return (
    <Link
      href={`/projects/${project.id}/board`}
      className={`p-4 bg-theme-surface border border-theme-default hover:border-brand-accent/40 hover:bg-theme-hover rounded-[8px] flex flex-col justify-between h-[96px] cursor-pointer transition-colors duration-150 active:scale-[0.99] group ${className}`}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: projectColor }}
        />
        <span className="text-[14px] font-medium text-theme-primary group-hover:text-brand-accent transition-colors truncate">
          {project.name}
        </span>
      </div>

      <div className="space-y-2">
        <div className="w-full h-1 bg-theme-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              backgroundColor: projectColor,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[12px] text-theme-secondary">
          <span>
            {doneCount}/{totalCount} done
          </span>
          <span className="font-mono">{percent}%</span>
        </div>
      </div>
    </Link>
  );
}
