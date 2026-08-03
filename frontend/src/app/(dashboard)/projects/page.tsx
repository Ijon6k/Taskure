"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pin, FolderKanban, Upload } from "lucide-react";
import { useProjects, projectsService, ProjectData } from "@/lib/api";
import { ProjectCard } from "@/components/features/project/project-card";
import { SearchInput } from "@/components/ui/search-input";
import { FilterPills } from "@/components/ui/filter-pills";
import { CreateProjectModal } from "@/components/features/project/create-project-modal";
import { EditProjectModal } from "@/components/features/project/edit-project-modal";
import { ImportJsonModal } from "@/components/features/project/import-json-modal";
import { ExportJsonModal } from "@/components/features/project/export-json-modal";
import { useUIStore } from "@/store/use-ui-store";
import { useTheme } from "@/components/providers/theme-provider";
import { PageContainer } from "@/components/ui/page-container";
import { toast } from "sonner";

type StatusFilter = "all" | "active" | "paused" | "completed" | "archived";

const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const { getProjectNavUrl } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null);
  const {
    isCreateProjectOpen,
    openCreateProject,
    closeCreateProject,
    isEditProjectOpen,
    editingProject,
    closeEditProject,
    isImportJsonOpen,
    openImportJson,
    closeImportJson,
    exportingProject,
    openExportJson,
    closeExportJson,
  } = useUIStore();

  const { data: projects = [], isLoading } = useProjects();

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

  const pinnedProjects = filteredProjects.filter(
    (p) => p.is_pinned && p.status !== "completed" && p.status !== "archived" && !p.is_archived
  );
  const unpinnedProjects = filteredProjects.filter(
    (p) => !p.is_pinned || p.status === "completed" || p.status === "archived" || p.is_archived
  );

  const handleExportProject = async (project: ProjectData) => {
    setExportingProjectId(project.id);
    try {
      const fullProject = await projectsService.getProject(project.id);
      openExportJson(fullProject);
    } catch (err: any) {
      toast.error(err.message || "Failed to load project data.");
    } finally {
      setExportingProjectId(null);
    }
  };

  const handleImportSuccess = (created: ProjectData) => {
    router.push(getProjectNavUrl(created.id));
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="flex flex-col items-center">
        <PageContainer variant="wide">
          {/* Header: Title & New Project Button */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-normal text-theme-primary tracking-tight">
              Projects
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={openImportJson}
                className="h-10 sm:h-9 w-10 sm:w-9 bg-surface-l3 hover:bg-surface-l4 text-theme-secondary hover:text-theme-primary border border-theme-subtle rounded-md flex items-center justify-center transition-colors cursor-pointer"
                title="Import JSON — create a new project"
                aria-label="Import JSON"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={openCreateProject}
                className="h-10 sm:h-9 px-3.5 bg-brand-accent hover:opacity-90 active:scale-95 text-on-accent text-xs sm:text-sm font-semibold rounded-md flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New project</span>
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search projects..."
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
                <span className="section-title !mb-0">Pinned</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
                {pinnedProjects.map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    project={proj}
                    variant="grid"
                    onExport={handleExportProject}
                    isExporting={exportingProjectId === proj.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Projects Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="section-title !mb-0">All projects</span>
              <span className="text-[11px] text-theme-tertiary font-mono">
                {unpinnedProjects.length}
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-pulse">
                <div className="h-32 bg-surface-hover rounded-md" />
                <div className="h-32 bg-surface-hover rounded-md" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <FolderKanban className="w-8 h-8 text-theme-tertiary mx-auto" />
                <p className="text-sm text-theme-secondary">No projects found</p>
                <p className="text-xs text-theme-tertiary">
                  Try adjusting your search query or status filter.
                </p>
              </div>
            ) : unpinnedProjects.length === 0 ? (
              <p className="text-[13px] text-theme-tertiary py-2">
                All matching projects are pinned above.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
                {unpinnedProjects.map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    project={proj}
                    variant="grid"
                    onExport={handleExportProject}
                    isExporting={exportingProjectId === proj.id}
                  />
                ))}
              </div>
            )}
          </div>
        </PageContainer>
      </div>

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

      <ImportJsonModal
        isOpen={isImportJsonOpen}
        onClose={closeImportJson}
        mode="create"
        onSuccess={handleImportSuccess}
      />

      {exportingProject && (
        <ExportJsonModal
          isOpen={Boolean(exportingProject)}
          project={exportingProject}
          onClose={closeExportJson}
        />
      )}
    </main>
  );
}
