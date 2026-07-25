"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FolderPlus, FolderKanban, Pin, Clock } from "lucide-react";
import { useProjects, useFocusTask } from "@/lib/api";
import { getTimeGreeting, getFormattedDate } from "@/lib/helpers";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TodaysFocusCard } from "@/components/features/dashboard/todays-focus-card";
import { ProjectCard } from "@/components/features/project/project-card";
import { CreateProjectModal } from "@/components/features/project/create-project-modal";
import { useUIStore } from "@/store/use-ui-store";
import { PageContainer } from "@/components/ui/page-container";

export default function HomePage() {
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();
  const { data: focusResp, isLoading: isFocusLoading } = useFocusTask();
  const isCreateProjectOpen = useUIStore((s) => s.isCreateProjectOpen);
  const openCreateProject = useUIStore((s) => s.openCreateProject);
  const closeCreateProject = useUIStore((s) => s.closeCreateProject);

  const focusData = focusResp?.focus || null;
  const isLoading = isProjectsLoading || isFocusLoading;

  const pinnedProjects = useMemo(() => projects.filter((p) => p.is_pinned), [projects]);
  const recentProjects = useMemo(() => projects.slice(0, 3), [projects]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-surface-l0 text-theme-primary font-sans select-none overflow-hidden">
      {/* Mobile Top Header */}
      <MobileHeader title="Dashboard" onOpenCreateProject={openCreateProject} />

      {/* Sidebar Navigation */}
      <Sidebar onOpenCreateProject={openCreateProject} />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center">
          <PageContainer variant="default">
            {/* Header Greeting */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-normal text-theme-primary tracking-tight leading-tight">
                {getTimeGreeting()}.
              </h1>
              <p className="text-xs sm:text-sm font-mono text-theme-secondary mt-1">
                {getFormattedDate()}
              </p>
            </div>

            {/* Today's Focus */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                Today's focus
              </div>
              <TodaysFocusCard focusData={focusData} loading={isLoading} />
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                Quick actions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={openCreateProject}
                  className="h-11 sm:h-10 px-3.5 border border-theme-default rounded-md flex items-center gap-2.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated active:bg-theme-hover transition-colors text-sm font-medium"
                >
                  <FolderPlus className="w-4 h-4 text-brand-accent shrink-0" />
                  <span>New project</span>
                </button>

                <Link
                  href="/projects"
                  className="h-11 sm:h-10 px-3.5 border border-theme-default rounded-md flex items-center gap-2.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated active:bg-theme-hover transition-colors text-sm font-medium"
                >
                  <FolderKanban className="w-4 h-4 text-brand-accent shrink-0" />
                  <span>Browse projects</span>
                </Link>
              </div>
            </div>

            {/* Pinned Projects Grid */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-theme-secondary" />
                <span className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Pinned
                </span>
              </div>

              {pinnedProjects.length === 0 ? (
                <div className="p-4 border border-theme-default rounded-md bg-theme-surface text-xs text-theme-secondary">
                  No pinned projects yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  {pinnedProjects.map((proj) => (
                    <ProjectCard key={proj.id} project={proj} variant="grid" />
                  ))}
                </div>
              )}
            </div>

            {/* Recent Projects */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-theme-secondary" />
                  <span className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                    Recent
                  </span>
                </div>
                <Link
                  href="/projects"
                  className="text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  View all
                </Link>
              </div>

              <div className="space-y-1.5">
                {recentProjects.map((proj) => (
                  <ProjectCard key={proj.id} project={proj} variant="compact" />
                ))}
              </div>
            </div>
          </PageContainer>
        </div>
      </main>

      {/* Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={closeCreateProject}
      />
    </div>
  );
}
