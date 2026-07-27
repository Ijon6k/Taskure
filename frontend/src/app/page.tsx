"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FolderPlus, FolderKanban } from "lucide-react";
import { useProjects, useFocusTask } from "@/lib/api";
import { getTimeGreeting, getFormattedDate } from "@/lib/helpers";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TodaysFocusHero } from "@/components/features/dashboard/todays-focus-hero";
import { RecommendedNextSection } from "@/components/features/dashboard/recommended-next-section";
import { RecentActivity } from "@/components/features/dashboard/recent-activity";
import { ProjectCard } from "@/components/features/project/project-card";
import { CreateProjectModal } from "@/components/features/project/create-project-modal";
import { useUIStore } from "@/store/use-ui-store";

export default function HomePage() {
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();
  const { data: focusResp, isLoading: isFocusLoading } = useFocusTask();
  const isCreateProjectOpen = useUIStore((s) => s.isCreateProjectOpen);
  const openCreateProject = useUIStore((s) => s.openCreateProject);
  const closeCreateProject = useUIStore((s) => s.closeCreateProject);

  const hero = focusResp?.hero || null;
  const recommendations = focusResp?.recommendations || [];
  const isLoading = isProjectsLoading || isFocusLoading;

  const pinnedProjects = useMemo(() => projects.filter((p) => p.is_pinned), [projects]);

  const contextualSubtext = useMemo(() => {
    if (hero?.task) {
      const title = hero.task.title.length > 60 ? hero.task.title.slice(0, 60) + "…" : hero.task.title;
      return `Your focus today is on "${title}" from ${hero.project?.name || "a project"}.`;
    }
    const activeCount = projects.filter((p) => p.status === "active").length;
    if (activeCount > 0) return `${activeCount} active ${activeCount === 1 ? "project" : "projects"} in your workspace.`;
    return "No active projects. Ready to start something new?";
  }, [hero, projects]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-surface-l0 text-theme-primary font-sans select-none overflow-hidden">
      <MobileHeader title="Home" onOpenCreateProject={openCreateProject} />
      <Sidebar onOpenCreateProject={openCreateProject} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1080px] mx-auto px-6 sm:px-10">
          {/* Greeting */}
          <div className="pt-12 sm:pt-16 pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[14px] text-theme-tertiary">
                  {getFormattedDate()}
                </p>
                <h1 className="text-[32px] sm:text-[44px] font-semibold text-theme-primary tracking-tight leading-[1.1]">
                  {getTimeGreeting()}
                </h1>
                <p className="text-[15px] text-theme-secondary leading-relaxed max-w-[560px]">
                  {contextualSubtext}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={openCreateProject}
                  className="px-4 py-2.5 text-[14px] font-medium text-on-accent bg-brand-accent hover:bg-brand-accent-hover rounded-[8px] transition-colors flex items-center gap-2"
                >
                  <FolderPlus className="w-4 h-4 shrink-0" />
                  <span>New project</span>
                </button>
                <Link
                  href="/projects"
                  className="px-4 py-2.5 text-[14px] font-medium text-theme-secondary bg-surface-l2 hover:bg-surface-l3 rounded-[8px] transition-colors flex items-center gap-2"
                >
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  <span>All projects</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Vertical content flow */}
          <div className="space-y-12 pb-14">
            {/* Today's Focus Hero — Full Width */}
            <div className="space-y-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-theme-tertiary">
                Today&apos;s focus
              </h2>
              <TodaysFocusHero hero={hero} loading={isLoading} />
            </div>

            {/* Recommended Next */}
            {recommendations.length > 0 && (
              <div className="space-y-3">
                <RecommendedNextSection recommendations={recommendations} loading={isLoading} />
              </div>
            )}

            {/* Pinned Projects */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold uppercase tracking-wide text-theme-tertiary">
                  Pinned projects
                </h2>
                <span className="text-[13px] text-theme-tertiary">
                  {pinnedProjects.length} pinned
                </span>
              </div>

              {pinnedProjects.length === 0 ? (
                <div className="py-10 border border-dashed border-theme-subtle rounded-[8px] text-center">
                  <p className="text-[15px] text-theme-tertiary">
                    No pinned projects yet. Pin projects from the workspace to show them here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedProjects.map((proj) => (
                    <ProjectCard key={proj.id} project={proj} variant="grid" />
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="space-y-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-theme-tertiary pb-2 border-b border-theme-subtle">
                Recent activity
              </h2>
              <RecentActivity projects={projects} limit={5} />
            </div>
          </div>
        </div>
      </main>

      <CreateProjectModal isOpen={isCreateProjectOpen} onClose={closeCreateProject} />
    </div>
  );
}
