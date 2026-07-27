"use client";

import { use, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, FileText, LayoutGrid, FileCode, Edit3, Filter } from "lucide-react";
import { useProject, TaskData } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { KanbanBoard } from "@/components/features/kanban/kanban-board";
import { TaskDrawer } from "@/components/features/task/task-drawer";
import { CreateProjectModal } from "@/components/features/project/create-project-modal";
import { EditProjectModal } from "@/components/features/project/edit-project-modal";
import { ImportJsonModal } from "@/components/features/project/import-json-modal";
import { ExportJsonModal } from "@/components/features/project/export-json-modal";
import { ProjectOverviewTab } from "@/components/features/project/project-overview-tab";
import { ProjectContextTab } from "@/components/features/project/project-context-tab";
import { BoardFilterToolbar } from "@/components/features/kanban/board-filter-toolbar";
import { BoardFilterState, DEFAULT_BOARD_FILTERS, filterAndSortTasks } from "@/lib/filter-tasks";
import { useUIStore } from "@/store/use-ui-store";
import { extractTaskTags } from "@/lib/tags";
import { ProjectStatusIndicator } from "@/components/ui/project-status-indicator";

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project, isLoading: loading, refetch } = useProject(projectId);
  const [activeTab, setActiveTab] = useState<"overview" | "board" | "context">("board");

  // Board Multi-Dimensional Filter State
  const [boardFilters, setBoardFilters] = useState<BoardFilterState>(DEFAULT_BOARD_FILTERS);

  const isCreateProjectOpen = useUIStore((s) => s.isCreateProjectOpen);
  const closeCreateProject = useUIStore((s) => s.closeCreateProject);
  const openCreateProject = useUIStore((s) => s.openCreateProject);
  const isEditProjectOpen = useUIStore((s) => s.isEditProjectOpen);
  const openEditProject = useUIStore((s) => s.openEditProject);
  const closeEditProject = useUIStore((s) => s.closeEditProject);
  const isImportJsonOpen = useUIStore((s) => s.isImportJsonOpen);
  const openImportJson = useUIStore((s) => s.openImportJson);
  const closeImportJson = useUIStore((s) => s.closeImportJson);
  const isExportJsonOpen = useUIStore((s) => s.isExportJsonOpen);
  const openExportJson = useUIStore((s) => s.openExportJson);
  const closeExportJson = useUIStore((s) => s.closeExportJson);
  const selectedTaskId = useUIStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useUIStore((s) => s.setSelectedTaskId);

  const handleTaskClick = useCallback((task: TaskData) => {
    setSelectedTaskId(task.id);
  }, [setSelectedTaskId]);

  // Extract all unique tags in the project
  const allTags = useMemo(() => {
    if (!project?.columns) return [];
    return Array.from(
      new Set(
        project.columns
          .flatMap((c) => c.tasks || [])
          .flatMap((t) => extractTaskTags(t))
      )
    ).filter(Boolean);
  }, [project?.columns]);

  // Apply multi-dimensional filters and sorting to column tasks
  const filteredColumns = useMemo(() => {
    if (!project?.columns) return [];
    return project.columns.map((col) => {
      const rawTasks = col.tasks || [];
      const filtered = filterAndSortTasks(rawTasks, boardFilters);
      return {
        ...col,
        tasks: filtered,
      };
    });
  }, [project?.columns, boardFilters]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-surface-l0 text-theme-primary font-sans select-none overflow-hidden">
      {/* Mobile Top Header */}
      <MobileHeader title={project?.name || "Project Board"} onOpenCreateProject={openCreateProject} />

      {/* Sidebar Navigation */}
      <Sidebar onOpenCreateProject={openCreateProject} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Navigation */}
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
              onClick={() => project && openEditProject(project)}
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
                onClick={() => setActiveTab("overview")}
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
                onClick={() => setActiveTab("board")}
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
                onClick={() => setActiveTab("context")}
                className={`px-2.5 py-1.5 md:py-2 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
                  activeTab === "context"
                    ? "border-brand-accent text-theme-primary font-semibold"
                    : "border-transparent text-theme-secondary hover:text-theme-primary"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 md:w-[15px] md:h-[15px]" />
                <span>Context</span>
              </button>
            </div>

            <div className="md:hidden flex items-center gap-1.5">
              <button
                onClick={() => project && openEditProject(project)}
                className="p-1.5 rounded-[6px] text-theme-secondary hover:text-theme-primary"
                title="Edit Project"
              >
                <Edit3 className="w-4 h-4 text-brand-accent" />
              </button>
            </div>
          </div>
        </header>

        {/* Main View Tab Content */}
        {activeTab === "board" && (
          <>
            {/* Multi-Dimensional Board Filter Toolbar */}
            <BoardFilterToolbar
              filters={boardFilters}
              onChangeFilters={setBoardFilters}
              boardTags={allTags}
              onExportJson={() => project && openExportJson(project)}
              onImportJson={openImportJson}
            />

            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex gap-4 animate-pulse h-full items-start p-4 md:p-6">
                  <div className="w-[280px] h-96 bg-theme-surface rounded-md" />
                  <div className="w-[280px] h-96 bg-theme-surface rounded-md" />
                  <div className="w-[280px] h-96 bg-theme-surface rounded-md" />
                </div>
              ) : (
                <KanbanBoard
                  projectId={projectId}
                  columns={filteredColumns}
                  onTaskClick={handleTaskClick}
                  onRefreshProject={refetch}
                />
              )}
            </div>
          </>
        )}

        {activeTab === "overview" && (
          <ProjectOverviewTab
            project={project || null}
            onRefreshProject={refetch}
            onSwitchTab={() => setActiveTab("board")}
          />
        )}

        {activeTab === "context" && (
          <ProjectContextTab projectId={projectId} />
        )}
      </div>

      {/* Task Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={refetch}
      />

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={closeCreateProject}
        onSuccess={() => refetch()}
      />

      {project && (
        <EditProjectModal
          isOpen={isEditProjectOpen}
          project={project}
          onClose={closeEditProject}
          onSuccess={() => refetch()}
        />
      )}

      <ImportJsonModal
        isOpen={isImportJsonOpen}
        onClose={closeImportJson}
        onSuccess={() => refetch()}
      />

      {project && (
        <ExportJsonModal
          isOpen={isExportJsonOpen}
          project={project}
          onClose={closeExportJson}
        />
      )}
    </div>
  );
}
