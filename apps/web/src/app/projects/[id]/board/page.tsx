"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, LayoutGrid, FileCode, Layers, Download, Upload } from "lucide-react";
import { useProject } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskDrawer } from "@/components/task/task-drawer";
import { CreateProjectModal } from "@/components/project/create-project-modal";

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project, isLoading: loading, refetch } = useProject(projectId);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "board" | "context">("board");

  const handleExportJSON = () => {
    if (!project) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project.name.toLowerCase().replace(/\s+/g, "-")}-export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (imported.name) {
          alert(`Berhasil membaca berkas ekspor "${imported.name}"!`);
        }
      } catch {
        alert("Gagal membaca berkas JSON.");
      }
    };
    input.click();
  };

  return (
    <div className="flex h-screen bg-black text-[#F0F0F0] font-sans select-none overflow-hidden">
      {/* Sidebar */}
      <Sidebar onOpenCreateProject={() => setIsCreateModalOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Header & Sub-Nav Tabs */}
        <header className="pt-5 px-8 border-b border-white/6 flex flex-col gap-3 shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-[12px] text-[#787878] font-medium">
            <Link href="/projects" className="hover:text-[#F0F0F0] transition-colors">
              Projects
            </Link>
            <ChevronRight className="w-3 h-3" />
          </div>

          {/* Project Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: project?.color || "#7F9CF5" }}
              />
              <h1 className="text-[20px] font-normal text-[#F0F0F0] tracking-tight">
                {project?.name || "Loading..."}
              </h1>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 text-[14px] font-medium pt-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "overview"
                  ? "border-[#F0F0F0] text-[#F0F0F0]"
                  : "border-transparent text-[#787878] hover:text-[#F0F0F0]"
              }`}
            >
              <FileText className="w-[15px] h-[15px]" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("board")}
              className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "board"
                  ? "border-[#F0F0F0] text-[#F0F0F0]"
                  : "border-transparent text-[#787878] hover:text-[#F0F0F0]"
              }`}
            >
              <LayoutGrid className="w-[15px] h-[15px]" />
              <span>Board</span>
            </button>

            <button
              onClick={() => setActiveTab("context")}
              className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "context"
                  ? "border-[#F0F0F0] text-[#F0F0F0]"
                  : "border-transparent text-[#787878] hover:text-[#F0F0F0]"
              }`}
            >
              <FileCode className="w-[15px] h-[15px]" />
              <span>Context</span>
            </button>
          </div>
        </header>

        {/* Action Bar & Hint */}
        <div className="px-8 py-3 flex items-center justify-between text-[12px] shrink-0">
          <p className="text-[#787878]">
            Drag tasks between columns to change status. Sync with any external tool via JSON.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Template feature available in Phase 2.")}
              className="px-2.5 py-1.5 rounded-[6px] border border-white/6 text-[#787878] hover:text-[#F0F0F0] hover:bg-[#141414] transition-colors flex items-center gap-1.5 font-medium"
            >
              <Layers className="w-[13px] h-[13px]" />
              <span>Template</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 rounded-[6px] border border-white/6 text-[#787878] hover:text-[#F0F0F0] hover:bg-[#141414] transition-colors flex items-center gap-1.5 font-medium"
            >
              <Download className="w-[13px] h-[13px]" />
              <span>Export</span>
            </button>

            <button
              onClick={handleImportJSON}
              className="px-2.5 py-1.5 rounded-[6px] bg-[#141414] border border-white/6 text-[#F0F0F0] hover:bg-[#1c1c1c] transition-colors flex items-center gap-1.5 font-medium"
            >
              <Upload className="w-[13px] h-[13px]" />
              <span>Import</span>
            </button>
          </div>
        </div>

        {/* Main View Tab Content */}
        {activeTab === "board" && (
          <div className="flex-1 overflow-hidden px-8 py-4">
            {loading ? (
              <div className="flex gap-5 animate-pulse">
                <div className="w-[280px] h-96 bg-[#0C0C0C] rounded-[6px]" />
                <div className="w-[280px] h-96 bg-[#0C0C0C] rounded-[6px]" />
                <div className="w-[280px] h-96 bg-[#0C0C0C] rounded-[6px]" />
              </div>
            ) : !project ? (
              <div className="p-8 text-center text-[#787878]">
                Proyek tidak ditemukan.
              </div>
            ) : (
              <KanbanBoard
                projectId={project.id}
                columns={project.columns || []}
                onTaskClick={(task) => setSelectedTaskId(task.id)}
                onRefreshProject={refetch}
              />
            )}
          </div>
        )}

        {activeTab === "overview" && (
          <div className="flex-1 p-8 text-[14px] text-[#787878]">
            <div className="max-w-2xl space-y-4">
              <h3 className="text-[18px] text-[#F0F0F0] font-medium">Overview</h3>
              <p>{project?.description || "Belum ada deskripsi projek."}</p>
            </div>
          </div>
        )}

        {activeTab === "context" && (
          <div className="flex-1 p-8 text-[14px] text-[#787878]">
            <div className="max-w-2xl space-y-4">
              <h3 className="text-[18px] text-[#F0F0F0] font-medium">Project Context Documents</h3>
              <p>Dokumen konteks pengetahuan untuk AI RAG (dapat diunggah di Phase 2).</p>
            </div>
          </div>
        )}
      </div>

      {/* Task Detail Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={refetch}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
