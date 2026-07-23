"use client";

import { useState } from "react";
import { Plus, Pin, FolderKanban } from "lucide-react";
import { useProjects } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { ProjectCard } from "@/components/features/project/project-card";
import { SearchInput } from "@/components/ui/search-input";
import { FilterPills } from "@/components/ui/filter-pills";
import { CreateProjectModal } from "@/components/features/project/create-project-modal";
import { EditProjectModal } from "@/components/features/project/edit-project-modal";

type StatusFilter = "all" | "active" | "paused" | "archived";

const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "archived", label: "Archived" },
];

import { useUIStore } from "@/store/use-ui-store";

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const {
    isCreateProjectOpen,
    openCreateProject,
    closeCreateProject,
    isEditProjectOpen,
    editingProject,
    openEditProject,
    closeEditProject,
  } = useUIStore();

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
    <div className="flex h-screen bg-theme-main text-theme-primary font-sans select-none overflow-hidden">
      {/* Sidebar */}
      <Sidebar onOpenCreateProject={openCreateProject} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[896px] px-8 py-16 space-y-8">
            {/* Header: Title & New Project Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-[24px] font-normal text-theme-primary tracking-tight">
                Projects
              </h1>
              <button
                onClick={openCreateProject}
                className="h-[36px] px-3.5 bg-brand-accent hover:bg-[#6b89e3] text-black text-[14px] font-medium rounded-[6px] flex items-center gap-2 transition-colors"
              >
                <Plus className="w-[15px] h-[15px]" />
                <span>New project</span>
              </button>
            </div>

            {/* Toolbar: Search input & Status filter pills */}
            <div className="flex items-center gap-3">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search projects…"
                className="flex-1"
              />
              <FilterPills
                options={STATUS_FILTER_OPTIONS}
                activeKey={statusFilter}
                onChange={setStatusFilter}
              />
            </div>

            {/* Pinned Section */}
            {pinnedProjects.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pin className="w-[12px] h-[12px] text-theme-secondary" />
                  <span className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                    Pinned
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pinnedProjects.map((proj) => (
                    <ProjectCard key={proj.id} project={proj} variant="detailed" onEdit={openEditProject} />
                  ))}
                </div>
              </div>
            )}

            {/* All Projects Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                  All projects
                </span>
                <span className="px-1.5 py-0.5 bg-theme-surface text-theme-secondary font-mono text-[12px] rounded-[4px] border border-theme-default">
                  {unpinnedProjects.length}
                </span>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
                  <div className="h-32 bg-theme-surface border border-theme-default rounded-[8px]" />
                  <div className="h-32 bg-theme-surface border border-theme-default rounded-[8px]" />
                </div>
              ) : unpinnedProjects.length === 0 ? (
                <div className="p-8 border border-theme-default rounded-[8px] bg-theme-surface text-center space-y-2">
                  <FolderKanban className="w-8 h-8 text-theme-secondary mx-auto" />
                  <p className="text-[14px] text-theme-primary">No projects found</p>
                  <p className="text-[12px] text-theme-secondary">
                    Try adjusting your search query or status filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {unpinnedProjects.map((proj) => (
                    <ProjectCard key={proj.id} project={proj} variant="detailed" onEdit={openEditProject} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Create Project */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={closeCreateProject}
      />

      {/* Modal Edit Project */}
      <EditProjectModal
        isOpen={isEditProjectOpen}
        project={editingProject}
        onClose={closeEditProject}
      />
    </div>
  );
}
