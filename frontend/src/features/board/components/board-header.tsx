"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CaretRight, CaretUpDown, Gear, FileText, SquaresFour, FolderOpen, Check } from "@phosphor-icons/react";
import { ProjectData } from "@/lib/api";
import { useProjects } from "@/lib/api/queries/use-projects";
import { useTheme } from "@/components/providers/theme-provider";

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
  const router = useRouter();
  const { getProjectNavUrl } = useTheme();
  const { data: projects = [] } = useProjects();

  return (
    <header className="px-3 md:px-5 pt-2.5 shrink-0 border-b border-theme-subtle bg-surface-l1 select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        {/* Left Section: Breadcrumb with Interactive Project Switcher Dropdown + Inline Tabs */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4 min-w-0">
          {/* Breadcrumb & Project Dropdown */}
          <div className="flex items-center gap-1.5 text-[13px] font-medium">
            <Link href="/projects" className="text-theme-secondary hover:text-theme-primary transition-colors">
              Projects
            </Link>
            <CaretRight className="w-3 h-3 text-theme-tertiary shrink-0" />

            {/* Interactive Project Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-theme-primary font-medium hover:bg-surface-hover transition-colors cursor-pointer outline-none group"
                >
                  <span className="truncate max-w-[160px] md:max-w-[220px]">
                    {project?.name || "Loading..."}
                  </span>
                  <CaretUpDown className="w-3.5 h-3.5 text-theme-tertiary group-hover:text-theme-primary transition-transform duration-150" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 w-64 max-h-72 overflow-y-auto rounded-md bg-surface-l4 border border-theme-strong p-1 shadow-elevation-l4 animate-in fade-in duration-100"
                  sideOffset={4}
                  align="start"
                >
                  <div className="px-2 py-1 text-[10px] font-mono text-theme-tertiary uppercase tracking-wider">
                    Switch Project
                  </div>
                  {projects.map((p) => {
                    const isSelected = p.id === project?.id;
                    return (
                      <DropdownMenu.Item
                        key={p.id}
                        onSelect={() => router.push(getProjectNavUrl(p.id))}
                        className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-[4px] text-[12px] font-medium outline-none cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-surface-hover text-theme-primary font-medium"
                            : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.color || "#5e6ad2" }}
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

          {/* Vertical Divider */}
          <div className="hidden sm:block h-3.5 w-px bg-theme-subtle shrink-0" />

          {/* Inline Navigation Sub-Route Tabs */}
          <nav className="flex items-center gap-1 text-[12px] font-medium">
            <button
              onClick={() => onTabChange("overview")}
              className={`h-7 px-2.5 rounded-[5px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "bg-surface-l2 text-theme-primary font-medium border border-theme-subtle shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => onTabChange("board")}
              className={`h-7 px-2.5 rounded-[5px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "board"
                  ? "bg-surface-l2 text-theme-primary font-medium border border-theme-subtle shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
              }`}
            >
              <SquaresFour className="w-3.5 h-3.5 shrink-0" />
              <span>Board</span>
            </button>

            <button
              onClick={() => onTabChange("resources")}
              className={`h-7 px-2.5 rounded-[5px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "resources"
                  ? "bg-surface-l2 text-theme-primary font-medium border border-theme-subtle shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Resources</span>
            </button>
          </nav>
        </div>

        {/* Right Section: Project Settings Gear Icon Button Only */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenEditProject}
            className="w-8 h-8 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer"
            title="Project Settings"
            aria-label="Project Settings"
          >
            <Gear className="w-4 h-4 text-theme-secondary hover:text-theme-primary transition-colors" />
          </button>
        </div>
      </div>
    </header>
  );
}
