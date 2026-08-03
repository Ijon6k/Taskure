"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CaretRight, CaretUpDown, Gear, FileText, SquaresFour, FolderOpen, Check, Notebook } from "@phosphor-icons/react";
import { ProjectData } from "@/lib/api";
import { useProjects } from "@/lib/api/queries/use-projects";
import { useTheme } from "@/components/providers/theme-provider";

interface ProjectSubHeaderProps {
  projectId: string;
  project?: ProjectData | null | undefined;
  onOpenEditProject?: ((project: ProjectData) => void) | undefined;
}

export function ProjectSubHeader({
  projectId,
  project,
  onOpenEditProject,
}: ProjectSubHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { getProjectNavUrl } = useTheme();
  const { data: projects = [] } = useProjects();

  const isOverview = pathname.endsWith("/overview");
  const isBoard = pathname.endsWith("/board") || pathname === `/projects/${projectId}`;
  const isResources = pathname.endsWith("/resources");
  const isNotebook = pathname.endsWith("/notebook");

  return (
    <header className="px-3 md:px-6 py-2 md:py-2.5 shrink-0 border-b border-theme-subtle bg-surface-l1 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
        {/* Left Container (Desktop: Breadcrumbs + Divider + Tabs, Mobile: Top row Breadcrumb + Settings) */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 min-w-0 flex-1">
          {/* Mobile Top Row / Desktop Left Side: Breadcrumb & Mobile Settings */}
          <div className="flex items-center justify-between gap-2 min-w-0 w-full md:w-auto">
            {/* Breadcrumb & Project Dropdown */}
            <div className="flex items-center gap-1.5 text-xs md:text-sm font-medium min-w-0">
              <Link href="/projects" className="text-theme-secondary hover:text-theme-primary transition-colors shrink-0">
                Projects
              </Link>
              <CaretRight className="w-3.5 h-3.5 text-theme-tertiary shrink-0" />

              {/* Interactive Project Dropdown */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-theme-primary font-semibold hover:bg-surface-hover transition-colors cursor-pointer outline-none group min-w-0"
                  >
                    <span className="truncate max-w-[150px] sm:max-w-[200px] md:max-w-[240px]">
                      {project?.name || "Loading..."}
                    </span>
                    <CaretUpDown className="w-3.5 h-3.5 text-theme-tertiary group-hover:text-theme-primary transition-transform duration-200 shrink-0" />
                  </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="z-50 w-64 max-h-72 overflow-y-auto rounded-md bg-theme-elevated border border-theme-subtle p-1.5 shadow-xl animate-in fade-in duration-100"
                    sideOffset={4}
                    align="start"
                  >
                    <div className="px-2 py-1 text-[11px] font-mono text-theme-tertiary uppercase tracking-wider">
                      Switch Project
                    </div>
                    {projects.map((p) => {
                      const isSelected = p.id === projectId;
                      return (
                        <DropdownMenu.Item
                          key={p.id}
                          onSelect={() => router.push(getProjectNavUrl(p.id))}
                          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium outline-none cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-surface-hover text-theme-primary font-semibold"
                              : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: p.color || "#7F9CF5" }}
                            />
                            <span className="truncate">{p.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand-accent shrink-0" />}
                        </DropdownMenu.Item>
                      );
                    })}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>

            {/* Mobile Settings Gear Icon Button */}
            {onOpenEditProject && project && (
              <button
                type="button"
                onClick={() => onOpenEditProject(project)}
                className="w-8 h-8 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer shrink-0 md:hidden"
                title="Project Settings"
                aria-label="Project Settings"
              >
                <Gear className="w-4 h-4 text-theme-secondary hover:text-theme-primary transition-colors" />
              </button>
            )}
          </div>

          {/* Desktop Divider */}
          <div className="hidden md:block h-4 w-px bg-theme-subtle shrink-0" />

          {/* Navigation Sub-Route Tabs (Mobile: Row 2, Desktop: Right after project title & divider) */}
          <nav className="flex items-center gap-1 text-xs md:text-sm font-medium overflow-x-auto no-scrollbar scrollbar-none py-0.5 min-w-0">
            <Link
              href={`/projects/${projectId}/overview`}
              className={`px-2.5 md:px-3 py-1.5 md:py-1 rounded-md flex items-center gap-1.5 transition-colors shrink-0 ${
                isOverview
                  ? "bg-theme-elevated text-theme-primary font-semibold shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Overview</span>
            </Link>

            <Link
              href={`/projects/${projectId}/board`}
              className={`px-2.5 md:px-3 py-1.5 md:py-1 rounded-md flex items-center gap-1.5 transition-colors shrink-0 ${
                isBoard
                  ? "bg-theme-elevated text-theme-primary font-semibold shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
              }`}
            >
              <SquaresFour className="w-3.5 h-3.5 shrink-0" />
              <span>Board</span>
            </Link>

            <Link
              href={`/projects/${projectId}/resources`}
              className={`px-2.5 md:px-3 py-1.5 md:py-1 rounded-md flex items-center gap-1.5 transition-colors shrink-0 ${
                isResources
                  ? "bg-theme-elevated text-theme-primary font-semibold shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Resources</span>
            </Link>

            <Link
              href={`/projects/${projectId}/notebook`}
              className={`px-2.5 md:px-3 py-1.5 md:py-1 rounded-md flex items-center gap-1.5 transition-colors shrink-0 ${
                isNotebook
                  ? "bg-theme-elevated text-theme-primary font-semibold shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
              }`}
            >
              <Notebook className="w-3.5 h-3.5 shrink-0" />
              <span>Notebook</span>
            </Link>
          </nav>
        </div>

        {/* Desktop Settings Gear Icon Button (Far Right) */}
        {onOpenEditProject && project && (
          <button
            type="button"
            onClick={() => onOpenEditProject(project)}
            className="w-8 h-8 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-surface-hover hidden md:flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-auto"
            title="Project Settings"
            aria-label="Project Settings"
          >
            <Gear className="w-4 h-4 text-theme-secondary hover:text-theme-primary transition-colors" />
          </button>
        )}
      </div>
    </header>
  );
}
