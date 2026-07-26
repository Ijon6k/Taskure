"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { ProjectData, TaskData } from "@/lib/api";
import { computeProjectUrgency } from "@/lib/utils/date";

interface ProjectCardProps {
  project: ProjectData;
  variant?: "grid" | "compact" | "detailed";
  className?: string;
  onEdit?: (project: ProjectData) => void;
}

export function ProjectCard({
  project,
  variant = "grid",
  className = "",
  onEdit,
}: ProjectCardProps) {
  const allTasks: TaskData[] =
    project.tasks && project.tasks.length > 0
      ? project.tasks
      : (project.columns || []).flatMap((col) => col.tasks || []);

  const projectColor = project.color || "#7F9CF5";
  const { taskCountText, urgencyText, urgencyColorClass } = computeProjectUrgency(
    allTasks,
    project.updated_at
  );

  if (variant === "compact") {
    return (
      <Link
        href={`/projects/${project.id}/board`}
        className={`flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-theme-hover cursor-pointer transition-colors duration-150 active:scale-[0.99] group ${className}`}
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
        <div className="flex items-center gap-1.5 text-[12px] font-mono shrink-0">
          <span className="text-theme-secondary">{taskCountText}</span>
          <span className="text-theme-tertiary">•</span>
          <span className={urgencyColorClass}>{urgencyText}</span>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative group/card h-full">
      <Link
        href={`/projects/${project.id}/board`}
        className={`p-4 bg-surface-l3 border border-theme-subtle hover:border-theme-default hover:bg-surface-hover rounded-md flex flex-col justify-between h-full min-h-[140px] space-y-3 cursor-pointer transition-colors duration-150 active:scale-[0.99] group shadow-elevation-l3 ${className}`}
      >
        {/* Top: Name & Description */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 pr-6">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: projectColor }}
            />
            <span className="text-[14px] font-medium text-theme-primary group-hover:text-brand-accent transition-colors line-clamp-1">
              {project.name}
            </span>
          </div>

          <p className="text-[12px] text-theme-secondary line-clamp-2 min-h-[2rem]">
            {project.description || (
              <span className="invisible">No description provided</span>
            )}
          </p>
        </div>

        {/* Footer: Metadata & Status (No Divider, No Badges) */}
        <div className="flex items-center justify-between text-[12px] pt-1 mt-auto">
          {/* Left Metadata: Task Count • Urgency */}
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-theme-secondary font-normal">
              {taskCountText}
            </span>
            <span className="text-theme-tertiary">•</span>
            <span className={urgencyColorClass}>{urgencyText}</span>
          </div>

          {/* Right Status: Lightweight Muted Typography */}
          <span className="text-theme-tertiary capitalize shrink-0 pl-2">
            {project.status || "Active"}
          </span>
        </div>
      </Link>

      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(project);
          }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-md flex items-center justify-center text-theme-secondary opacity-100 md:opacity-0 md:group-hover/card:opacity-100 hover:bg-theme-elevated hover:text-theme-primary transition-all duration-150"
          title="Project settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}


