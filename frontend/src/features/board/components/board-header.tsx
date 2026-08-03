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
    <header className="px-3 md:px-6 pt-3 shrink-0 border-b border-theme-subtle bg-surface-l1 select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5">
        {/* Left Section: Breadcrumb with Interactive Project Switcher Dropdown + Inline Tabs */}
        <div className="flex flex-wrap items-center gap-3 md:gap-5 min-w-0">
          {/* Breadcrumb & Project Dropdown */}
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Link href="/projects" className="text-theme-secondary hover:text-theme-primary transition-colors">
              Projects
            </Link>
            <CaretRight className="w-3.5 h-3.5 text-theme-tertiary shrink-0" />

            {/* Interactive Project Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-theme-primary font-semibold hover:bg-surface-hover transition-colors cursor-pointer outline-none group"
                >
                  <span className="truncate max-w-[160px] md:max-w-[220px]">
                    {project?.name || "Loading..."}
                  </span>
                  <CaretUpDown className="w-3.5 h-3.5 text-theme-tertiary group-hover:text-theme-primary transition-transform duration-200" />
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
                    const isSelected = p.id === project?.id;
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

          {/* Vertical Divider */}
          <div className="hidden sm:block h-4 w-px bg-theme-subtle shrink-0" />

          {/* Inline Navigation Sub-Route Tabs */}
          <nav className="flex items-center gap-1 text-xs md:text-sm font-medium">
            <button
              onClick={() => onTabChange("overview")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "bg-theme-elevated text-theme-primary font-semibold shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => onTabChange("board")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "board"
                  ? "bg-theme-elevated text-theme-primary font-semibold shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
              }`}
            >
              <SquaresFour className="w-3.5 h-3.5 shrink-0" />
              <span>Board</span>
            </button>

            <button
              onClick={() => onTabChange("resources")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "resources"
                  ? "bg-theme-elevated text-theme-primary font-semibold shadow-xs"
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
