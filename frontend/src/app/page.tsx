"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderPlus, FolderKanban, Pin, Clock } from "lucide-react";
import { useProjects, useFocusTask } from "@/lib/api";
import { getTimeGreeting, getFormattedDate } from "@/lib/helpers";
import { Sidebar } from "@/components/layout/sidebar";
import { TodaysFocusCard } from "@/components/dashboard/todays-focus-card";
import { ProjectCard } from "@/components/project/project-card";
import { CreateProjectModal } from "@/components/project/create-project-modal";

export default function HomePage() {
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();
  const { data: focusResp, isLoading: isFocusLoading } = useFocusTask();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const focusData = focusResp?.focus || null;
  const isLoading = isProjectsLoading || isFocusLoading;

  const pinnedProjects = projects.filter((p) => p.is_pinned);
  const recentProjects = projects.slice(0, 3);

  return (
    <div className="flex h-screen bg-theme-main text-theme-primary font-sans select-none overflow-hidden">
      {/* Sidebar */}
      <Sidebar onOpenCreateProject={() => setIsCreateModalOpen(true)} />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[672px] px-8 py-16 space-y-12">
            {/* Header Greeting */}
            <div>
              <h1 className="text-[32px] font-normal text-theme-primary tracking-tight leading-tight">
                {getTimeGreeting()}.
              </h1>
              <p className="text-[14px] font-mono text-theme-secondary mt-1.5">
                {getFormattedDate()}
              </p>
            </div>

            {/* Today's Focus */}
            <div className="space-y-3">
              <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                Today's focus
              </div>
              <TodaysFocusCard focusData={focusData} loading={isLoading} />
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                Quick actions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-[42px] px-3 border border-theme-default rounded-[6px] flex items-center gap-2.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors text-[14px] font-medium"
                >
                  <FolderPlus className="w-[15px] h-[15px]" />
                  <span>New project</span>
                </button>

                <Link
                  href="/projects"
                  className="h-[42px] px-3 border border-theme-default rounded-[6px] flex items-center gap-2.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors text-[14px] font-medium"
                >
                  <FolderKanban className="w-[15px] h-[15px]" />
                  <span>Browse projects</span>
                </Link>
              </div>
            </div>

            {/* Pinned Projects Grid */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Pin className="w-[12px] h-[12px] text-theme-secondary" />
                <span className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                  Pinned
                </span>
              </div>

              {pinnedProjects.length === 0 ? (
                <div className="p-4 border border-theme-default rounded-[8px] bg-theme-surface text-xs text-theme-secondary">
                  Belum ada projek yang di-pin.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pinnedProjects.map((proj) => (
                    <ProjectCard key={proj.id} project={proj} variant="grid" />
                  ))}
                </div>
              )}
            </div>

            {/* Recent Projects */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-[12px] h-[12px] text-theme-secondary" />
                  <span className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                    Recent
                  </span>
                </div>
                <Link
                  href="/projects"
                  className="text-[12px] font-medium text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  View all
                </Link>
              </div>

              <div className="space-y-1">
                {recentProjects.map((proj) => (
                  <ProjectCard key={proj.id} project={proj} variant="compact" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
