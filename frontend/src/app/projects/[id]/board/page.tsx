"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, LayoutGrid, FileCode, Download, Upload, Edit3 } from "lucide-react";
import { useProject, TaskData } from "@/lib/api";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { KanbanBoard } from "@/components/features/kanban/kanban-board";
import { TaskDrawer } from "@/components/features/task/task-drawer";
import { CreateProjectModal } from "@/components/features/project/create-project-modal";
import { EditProjectModal } from "@/components/features/project/edit-project-modal";
import { ImportJsonModal } from "@/components/features/project/import-json-modal";
import { ExportJsonModal } from "@/components/features/project/export-json-modal";
import { ProjectOverviewTab } from "@/components/features/project/project-overview-tab";
import { ProjectContextTab } from "@/components/features/project/project-context-tab";

import { useUIStore } from "@/store/use-ui-store";

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project, isLoading: loading, refetch } = useProject(projectId);
  const [activeTab, setActiveTab] = useState<"overview" | "board" | "context">("board");

  const {
    isCreateProjectOpen,
    closeCreateProject,
    openCreateProject,
    isEditProjectOpen,
    openEditProject,
    closeEditProject,
    isImportJsonOpen,
    openImportJson,
    closeImportJson,
    isExportJsonOpen,
    openExportJson,
    closeExportJson,
    selectedTaskId,
    setSelectedTaskId,
  } = useUIStore();

  return (
    <div className="flex h-screen bg-theme-main text-theme-primary font-sans select-none overflow-hidden">
      {/* Sidebar */}
      <Sidebar onOpenCreateProject={openCreateProject} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Navigation */}
        <header className="pt-5 px-8 border-b border-theme-default flex flex-col gap-3 shrink-0 bg-theme-surface">
          {/* Breadcrumbs (+1 step size) */}
          <div className="flex items-center gap-1.5 text-[14px] text-theme-secondary font-medium">
            <Link href="/projects" className="hover:text-theme-primary transition-colors">
              Projects
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-theme-tertiary" />
            <span className="text-theme-primary font-medium">{project?.name || "..."}</span>
          </div>

          {/* Project Title & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{project?.icon || "⚡"}</span>
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: project?.color || "#7F9CF5" }}
              />
              <h1 className="text-[20px] font-medium text-theme-primary tracking-tight">
                {project?.name || "Loading..."}
              </h1>
              {project?.status && (
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-theme-elevated border border-theme-default text-theme-secondary capitalize">
                  {project.status}
                </span>
              )}
            </div>

            <button
              onClick={() => project && openEditProject(project)}
              className="px-3 py-1.5 rounded-[6px] bg-theme-elevated hover:bg-theme-hover border border-theme-default text-theme-primary text-[13px] font-medium transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-brand-accent" />
              <span>Edit Project</span>
            </button>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 text-[14px] font-medium pt-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "overview"
                  ? "border-brand-accent text-theme-primary"
                  : "border-transparent text-theme-secondary hover:text-theme-primary"
              }`}
            >
              <FileText className="w-[15px] h-[15px]" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("board")}
              className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "board"
                  ? "border-brand-accent text-theme-primary"
                  : "border-transparent text-theme-secondary hover:text-theme-primary"
              }`}
            >
              <LayoutGrid className="w-[15px] h-[15px]" />
              <span>Board</span>
            </button>

            <button
              onClick={() => setActiveTab("context")}
              className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "context"
                  ? "border-brand-accent text-theme-primary"
                  : "border-transparent text-theme-secondary hover:text-theme-primary"
              }`}
            >
              <FileCode className="w-[15px] h-[15px]" />
              <span>Context</span>
            </button>
          </div>
        </header>

        {/* Action Bar */}
        <div className="px-8 py-2.5 flex items-center justify-between text-[12px] shrink-0 border-b border-theme-subtle bg-theme-surface/50">
          <p className="text-theme-secondary">
            Drag tasks between columns to change status. Sync with any external tool via JSON.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => project && openExportJson(project)}
              className="px-2.5 py-1 rounded-[6px] border border-theme-default text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors flex items-center gap-1.5 font-medium"
            >
              <Download className="w-[13px] h-[13px]" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={openImportJson}
              className="px-2.5 py-1 rounded-[6px] bg-theme-elevated border border-theme-default text-theme-primary hover:bg-theme-hover transition-colors flex items-center gap-1.5 font-medium"
            >
              <Upload className="w-[13px] h-[13px]" />
              <span>Import JSON</span>
            </button>
          </div>
        </div>

        {/* Main View Tab Content */}
        {activeTab === "board" && (
          <div className="flex-1 overflow-hidden px-8 py-4">
            {loading ? (
              <div className="flex gap-5 animate-pulse">
                <div className="w-[280px] h-96 bg-theme-surface rounded-[6px]" />
                <div className="w-[280px] h-96 bg-theme-surface rounded-[6px]" />
                <div className="w-[280px] h-96 bg-theme-surface rounded-[6px]" />
              </div>
            ) : !project ? (
              <div className="p-8 text-center text-theme-secondary">
                Proyek tidak ditemukan.
              </div>
            ) : (
              <KanbanBoard
                projectId={project.id}
                columns={project.columns || []}
                onTaskClick={(task: TaskData) => setSelectedTaskId(task.id)}
                onRefreshProject={refetch}
              />
            )}
          </div>
        )}

        {activeTab === "overview" && (
          <ProjectOverviewTab
            project={project || null}
            onRefreshProject={refetch}
            onSwitchTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "context" && (
          <ProjectContextTab
            projectId={projectId}
            contexts={project?.contexts || []}
          />
        )}
      </div>

      {/* Modals & Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={refetch}
      />

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={closeCreateProject}
        onSuccess={() => refetch()}
      />

      <EditProjectModal
        isOpen={isEditProjectOpen}
        project={project || null}
        onClose={closeEditProject}
        onSuccess={() => refetch()}
      />

      <ImportJsonModal
        isOpen={isImportJsonOpen}
        onClose={closeImportJson}
        onSuccess={() => refetch()}
      />

      <ExportJsonModal
        isOpen={isExportJsonOpen}
        project={project || null}
        onClose={closeExportJson}
      />
    </div>
  );
}
