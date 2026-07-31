"use client";

import Link from "next/link";
import { ChevronRight, FileText, LayoutGrid, FolderOpen, Edit3 } from "lucide-react";
import { ProjectData } from "@/lib/api";
import { ProjectStatusIndicator } from "@/components/ui/project-status-indicator";

interface BoardHeaderProps {
  project?: ProjectData | null | undefined;
  activeTab: "overview" | "board" | "resources";
  onTabChange: (tab: "overview" | "board" | "resources") => void;
  onOpenEditProject?: (() => void) | undefined;
}

export function BoardHeader({
  project,
  activeTab,
  onTabChange,
  onOpenEditProject,
}: BoardHeaderProps) {
  return (
    <header className="pt-2 md:pt-4 px-3 md:px-8 flex flex-col gap-2 shrink-0">
      {/* Breadcrumbs (Desktop only) */}
      <div className="hidden md:flex items-center gap-1.5 text-[15px] text-theme-secondary font-medium truncate">
        <Link href="/projects" className="hover:text-theme-primary transition-colors">
          Projects
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-theme-tertiary shrink-0" />
        <span className="text-theme-primary font-medium truncate">{project?.name || "..."}</span>
      </div>

      {/* Project Title & Actions (Desktop view) */}
      <div className="hidden md:flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0">{project?.icon || "⚡"}</span>
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: project?.color || "#7F9CF5" }}
          />
          <h1 className="text-[24px] font-medium text-theme-primary tracking-tight truncate">
            {project?.name || "Loading..."}
          </h1>
          {project?.status && (
            <ProjectStatusIndicator status={project.status} className="ml-1" />
          )}
        </div>

        <button
          onClick={onOpenEditProject}
          className="px-3 py-1 hover:bg-surface-hover rounded-md text-[13px] text-theme-secondary hover:text-theme-primary font-medium transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5 text-brand-accent" />
          <span>Project Settings</span>
        </button>
      </div>

      {/* Main Navigation Tabs Bar */}
      <div className="flex items-center justify-between pt-1 border-b border-theme-subtle">
        <div className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
          <button
            onClick={() => onTabChange("overview")}
            className={`px-2.5 py-1.5 md:py-2 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
              activeTab === "overview"
                ? "border-brand-accent text-theme-primary font-semibold"
                : "border-transparent text-theme-secondary hover:text-theme-primary"
            }`}
          >
            <FileText className="w-3.5 h-3.5 md:w-[15px] md:h-[15px]" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => onTabChange("board")}
            className={`px-2.5 py-1.5 md:py-2 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
              activeTab === "board"
                ? "border-brand-accent text-theme-primary font-semibold"
                : "border-transparent text-theme-secondary hover:text-theme-primary"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 md:w-[15px] md:h-[15px]" />
            <span>Board</span>
          </button>

          <button
            onClick={() => onTabChange("resources")}
            className={`px-2.5 py-1.5 md:py-2 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
              activeTab === "resources"
                ? "border-brand-accent text-theme-primary font-semibold"
                : "border-transparent text-theme-secondary hover:text-theme-primary"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 md:w-[15px] md:h-[15px]" />
            <span>Resources</span>
          </button>
        </div>

        <div className="md:hidden flex items-center gap-1.5">
          <button
            onClick={onOpenEditProject}
            className="p-1.5 rounded-[6px] text-theme-secondary hover:text-theme-primary"
            title="Edit Project"
          >
            <Edit3 className="w-4 h-4 text-brand-accent" />
          </button>
        </div>
      </div>
    </header>
  );
}
