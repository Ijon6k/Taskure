"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Pin, MoreVertical, Download, Settings2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ProjectData, useUpdateProject } from "@/lib/api";
import { useTheme } from "@/components/providers/theme-provider";
import { useUIStore } from "@/store/use-ui-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ProjectCardProps {
  project: ProjectData;
  variant?: "grid" | "compact";
  className?: string;
  onEdit?: (project: ProjectData) => void;
  onExport?: (project: ProjectData) => void;
  isExporting?: boolean;
}

function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export const ProjectCard = memo(function ProjectCard({
  project,
  variant = "grid",
  className = "",
  onEdit,
  onExport,
  isExporting = false,
}: ProjectCardProps) {
  const { getProjectNavUrl } = useTheme();
  const openEditProject = useUIStore((s) => s.openEditProject);
  const updateProjectMutation = useUpdateProject();

  const handleTogglePin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (project.status === "completed" || project.status === "archived" || project.is_archived) {
      toast.info("Completed or archived projects cannot be pinned.");
      return;
    }
    const newPinnedState = !project.is_pinned;
    updateProjectMutation.mutate(
      { id: project.id, data: { is_pinned: newPinnedState } },
      {
        onSuccess: () => {
          toast.success(newPinnedState ? "Project pinned to top!" : "Project unpinned");
        },
        onError: (err) => {
          toast.error("Failed to update pin status: " + err.message);
        },
      }
    );
  };

  const handleOpenSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) {
      onEdit(project);
    } else {
      openEditProject(project);
    }
  };

  const { columnsWithCounts, totalTasks, projectColor, lastUpdated } = useMemo(() => {
    const cols = (project.columns || []).map((col) => ({
      id: col.id,
      name: col.name,
      color: col.color,
      // Board responses carry the full tasks array; list responses carry task_count.
      count: col.tasks ? col.tasks.length : (col.task_count ?? 0),
      behavior: col.behavior,
    }));
    const total = cols.reduce((sum, c) => sum + c.count, 0);
    return {
      columnsWithCounts: cols,
      totalTasks: total,
      projectColor: project.color || "#7F9CF5",
      lastUpdated: relativeTime(project.updated_at),
    };
  }, [project]);

  if (variant === "compact") {
    return (
      <Link
        href={getProjectNavUrl(project.id)}
        className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-surface-hover/40 transition-colors group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 truncate">
          <span
            className="w-2 h-2 shrink-0 rounded-full"
            style={{ backgroundColor: projectColor }}
          />
          <span className="text-[14px] font-medium text-theme-secondary group-hover:text-theme-primary transition-colors truncate">
            {project.name}
          </span>
          {project.is_pinned && (
            <Pin className="w-3 h-3 text-brand-accent fill-brand-accent shrink-0 rotate-45" />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[12px] text-theme-tertiary mr-1">
            {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
          </span>
          <button
            type="button"
            onClick={handleTogglePin}
            className="p-1 rounded text-theme-tertiary hover:text-brand-accent hover:bg-surface-l3 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            title={project.is_pinned ? "Unpin project" : "Pin project"}
          >
            <Pin className={`w-3.5 h-3.5 rotate-45 ${project.is_pinned ? "text-brand-accent fill-brand-accent" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenSettings}
            className="p-1 rounded text-theme-tertiary hover:text-theme-primary hover:bg-surface-l3 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            title="Project settings"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={getProjectNavUrl(project.id)}
      className={`group/card flex flex-col justify-between h-[175px] p-5 bg-surface-l2 rounded-md hover:bg-surface-hover/80 transition-all duration-150 relative ${className}`}
    >
      <div>
        {/* Header: Color Dot + Title + Theme Accent Pinned Toggle + 3-dots Menu */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: projectColor }}
            />
            <h3 className="text-[17px] font-semibold text-theme-primary transition-colors truncate">
              {project.name}
            </h3>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 -mr-1">
            {/* Pinned Toggle Button (Theme Accent Color) */}
            <button
              type="button"
              onClick={handleTogglePin}
              disabled={updateProjectMutation.isPending}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                project.is_pinned
                  ? "text-brand-accent opacity-100 hover:bg-surface-l3/80"
                  : "text-theme-tertiary hover:text-brand-accent hover:bg-surface-l3/80 opacity-0 group-hover/card:opacity-100"
              }`}
              title={project.is_pinned ? "Unpin project" : "Pin to top"}
            >
              <Pin
                className={`w-3.5 h-3.5 rotate-45 transition-transform ${
                  project.is_pinned ? "fill-brand-accent" : ""
                }`}
              />
            </button>

            {/* 3 Dots Menu: Export JSON + Project Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-1.5 rounded-md text-theme-tertiary hover:text-theme-primary hover:bg-surface-l3 opacity-0 group-hover/card:opacity-100 transition-all cursor-pointer"
                  title="Project actions"
                  aria-label="Project actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuItem
                  onSelect={() => onExport?.(project)}
                  disabled={isExporting}
                  className="flex items-center gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 text-theme-tertiary animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-theme-secondary" />
                  )}
                  <span>{isExporting ? "Loading data…" : "Export JSON"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    if (onEdit) {
                      onEdit(project);
                    } else {
                      openEditProject(project);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <Settings2 className="w-3.5 h-3.5 text-theme-secondary" />
                  <span>Project settings</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Fixed Height Description Area with Ellipsis */}
        <div className="h-10 mb-3 overflow-hidden">
          {project.description ? (
            <p className="text-[13px] text-theme-secondary leading-snug line-clamp-2">
              {project.description}
            </p>
          ) : (
            <p className="text-[13px] text-theme-tertiary italic leading-snug">
              No description provided
            </p>
          )}
        </div>
      </div>

      <div>
        {/* Fixed Progress / Distribution Bar */}
        <div className="w-full h-[3px] bg-surface-l1/50 rounded-full overflow-hidden flex gap-px mb-3">
          {totalTasks > 0 ? (
            columnsWithCounts.map((col) => {
              if (col.count === 0) return null;
              const widthPct = (col.count / totalTasks) * 100;
              return (
                <div
                  key={col.id}
                  className="h-full"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: col.color || projectColor,
                    opacity: 0.8,
                  }}
                  title={`${col.name}: ${col.count}`}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-surface-l1/30" />
          )}
        </div>

        {/* Footer: task count + last updated */}
        <div className="flex items-center justify-between text-[12px] text-theme-tertiary pt-0.5">
          <span>{totalTasks} {totalTasks === 1 ? "task" : "tasks"}</span>
          {lastUpdated && <span>{lastUpdated}</span>}
        </div>
      </div>
    </Link>
  );
});
