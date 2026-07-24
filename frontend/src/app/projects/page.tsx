"use client";

import { useState } from "react";
import { Plus, Pin, FolderKanban } from "lucide-react";
import { useProjects } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { ProjectCard } from "@/components/features/project/project-card";
import { SearchInput } from "@/components/ui/search-input";
import { FilterPills } from "@/components/ui/filter-pills";
import { CreateProjectModal } from "@/components/features/project/create-project-modal";
import { EditProjectModal } from "@/components/features/project/edit-project-modal";
import { useUIStore } from "@/store/use-ui-store";

type StatusFilter = "all" | "active" | "paused" | "archived";

const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "archived", label: "Archived" },
];

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
    <div className="flex flex-col md:flex-row h-screen bg-surface-l0 text-theme-primary font-sans select-none overflow-hidden">
      {/* Mobile Top Header */}
      <MobileHeader title="Projects" onOpenCreateProject={openCreateProject} />

      {/* Sidebar Navigation */}
      <Sidebar onOpenCreateProject={openCreateProject} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[896px] px-3.5 sm:px-8 py-4 sm:py-10 md:py-12 space-y-5 sm:space-y-8">
            {/* Header: Title & New Project Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl font-normal text-theme-primary tracking-tight">
                Projects
              </h1>
              <button
                onClick={openCreateProject}
                className="h-10 sm:h-9 px-3.5 bg-brand-accent hover:opacity-90 active:scale-95 text-black text-xs sm:text-sm font-semibold rounded-md flex items-center gap-2 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New project</span>
              </button>
            </div>

            {/* Toolbar: Search input & Status filter pills */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search projects…"
                className="flex-1"
              />
              <div className="overflow-x-auto pb-1 sm:pb-0">
                <FilterPills
                  options={STATUS_FILTER_OPTIONS}
                  activeKey={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
            </div>

            {/* Pinned Section */}
            {pinnedProjects.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pin className="w-3.5 h-3.5 text-theme-secondary" />
                  <span className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                    Pinned
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {pinnedProjects.map((proj) => (
                    <ProjectCard key={proj.id} project={proj} variant="detailed" onEdit={openEditProject} />
                  ))}
                </div>
              </div>
            )}

            {/* All Projects Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  All projects
                </span>
                <span className="px-1.5 py-0.5 bg-theme-surface text-theme-secondary font-mono text-xs rounded border border-theme-default">
                  {unpinnedProjects.length}
                </span>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-pulse">
                  <div className="h-32 bg-theme-surface border border-theme-default rounded-lg" />
                  <div className="h-32 bg-theme-surface border border-theme-default rounded-lg" />
                </div>
              ) : unpinnedProjects.length === 0 ? (
                <div className="p-8 border border-theme-default rounded-lg bg-theme-surface text-center space-y-2">
                  <FolderKanban className="w-8 h-8 text-theme-secondary mx-auto" />
                  <p className="text-sm text-theme-primary">No projects found</p>
                  <p className="text-xs text-theme-secondary">
                    Try adjusting your search query or status filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {unpinnedProjects.map((proj) => (
                    <ProjectCard key={proj.id} project={proj} variant="detailed" onEdit={openEditProject} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={closeCreateProject}
      />

      <EditProjectModal
        isOpen={isEditProjectOpen}
        project={editingProject}
        onClose={closeEditProject}
      />
    </div>
  );
}
