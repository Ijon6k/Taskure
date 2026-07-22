"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Pin, FolderKanban } from "lucide-react";
import { useProjects } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateProjectModal } from "@/components/project/create-project-modal";

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "archived">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: projects = [], isLoading } = useProjects();

  // Filter projects by search & status
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === "archived") {
      matchesStatus = p.is_archived || p.status === "archived";
    } else if (statusFilter !== "all") {
      matchesStatus = p.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const pinnedProjects = filteredProjects.filter((p) => p.is_pinned);
  const unpinnedProjects = filteredProjects.filter((p) => !p.is_pinned);

  return (
    <div className="flex h-screen bg-black text-[#F0F0F0] font-sans select-none overflow-hidden">
      {/* Sidebar */}
      <Sidebar onOpenCreateProject={() => setIsCreateModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[896px] px-8 py-16 space-y-8">
            {/* Header: Title & New Project Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-[24px] font-normal text-[#F0F0F0] tracking-tight">
                Projects
              </h1>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="h-[36px] px-3.5 bg-[#7F9CF5] hover:bg-[#6b89e3] text-black text-[14px] font-medium rounded-[6px] flex items-center gap-2 transition-colors"
              >
                <Plus className="w-[15px] h-[15px]" />
                <span>New project</span>
              </button>
            </div>

            {/* Toolbar: Search input & Status filter tabs */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[36px] px-3 bg-[#141414] border border-white/6 rounded-[6px] flex items-center gap-2.5">
                <Search className="w-[15px] h-[15px] text-[#787878]" />
                <input
                  type="text"
                  placeholder="Search projects…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[14px] text-[#F0F0F0] placeholder-[#787878] outline-none"
                />
              </div>

              {/* Segmented Filter Pills */}
              <div className="h-[36px] p-1 bg-[#141414] rounded-[6px] flex items-center gap-1">
                {(["all", "active", "paused", "archived"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-2.5 py-1 rounded-[4px] text-[12px] font-medium capitalize transition-colors ${
                      statusFilter === tab
                        ? "bg-[#1A1A1A] text-[#F0F0F0]"
                        : "text-[#787878] hover:text-[#F0F0F0]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Pinned Section */}
            {pinnedProjects.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pin className="w-[12px] h-[12px] text-[#787878]" />
                  <span className="text-[12px] font-medium text-[#787878] uppercase tracking-[0.6px]">
                    Pinned
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pinnedProjects.map((proj) => {
                    const tasks = proj.tasks || [];
                    const doneCount = tasks.filter((t) => t.status === "done").length;
                    const totalCount = tasks.length;
                    const percent =
                      totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                    return (
                      <Link
                        key={proj.id}
                        href={`/projects/${proj.id}/board`}
                        className="p-4 bg-[#0C0C0C] border border-white/6 hover:border-white/20 rounded-[8px] flex flex-col justify-between space-y-3 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: proj.color || "#7F9CF5" }}
                          />
                          <span className="text-[14px] font-medium text-[#F0F0F0] group-hover:text-[#7F9CF5] transition-colors truncate">
                            {proj.name}
                          </span>
                        </div>

                        {proj.description && (
                          <p className="text-[12px] text-[#787878] line-clamp-2">
                            {proj.description}
                          </p>
                        )}

                        <div className="space-y-2 pt-1">
                          <div className="w-full h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: proj.color || "#7F9CF5",
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[12px] text-[#787878]">
                            <span>{doneCount}/{totalCount} tasks</span>
                            <span className="font-mono text-[#787878]">Active</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Projects Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-[#787878] uppercase tracking-[0.6px]">
                  All projects
                </span>
                <span className="px-1.5 py-0.5 bg-[#1A1A1A] text-[#787878] font-mono text-[12px] rounded-[4px]">
                  {unpinnedProjects.length}
                </span>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
                  <div className="h-32 bg-[#0C0C0C] border border-white/6 rounded-[8px]" />
                  <div className="h-32 bg-[#0C0C0C] border border-white/6 rounded-[8px]" />
                </div>
              ) : unpinnedProjects.length === 0 ? (
                <div className="p-8 border border-white/6 rounded-[8px] bg-[#0C0C0C] text-center space-y-2">
                  <FolderKanban className="w-8 h-8 text-[#787878] mx-auto" />
                  <p className="text-[14px] text-[#F0F0F0]">Tidak ada proyek ditemukan</p>
                  <p className="text-[12px] text-[#787878]">
                    Coba sesuaikan kata kunci pencarian atau filter status.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {unpinnedProjects.map((proj) => {
                    const tasks = proj.tasks || [];
                    const doneCount = tasks.filter((t) => t.status === "done").length;
                    const totalCount = tasks.length;

                    return (
                      <Link
                        key={proj.id}
                        href={`/projects/${proj.id}/board`}
                        className="p-4 bg-[#0C0C0C] border border-white/6 hover:border-white/20 rounded-[8px] flex flex-col justify-between space-y-3 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: proj.color || "#68D391" }}
                            />
                            <span className="text-[14px] font-medium text-[#F0F0F0] group-hover:text-[#7F9CF5] transition-colors truncate">
                              {proj.name}
                            </span>
                          </div>
                        </div>

                        {proj.description && (
                          <p className="text-[12px] text-[#787878] line-clamp-2">
                            {proj.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[12px] text-[#787878] pt-1">
                          <span>{doneCount}/{totalCount} tasks</span>
                          <span className="capitalize">{proj.status || "active"}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Create Project */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
