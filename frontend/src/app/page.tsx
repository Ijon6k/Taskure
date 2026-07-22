"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderPlus, FolderKanban, Pin, Clock } from "lucide-react";
import { useProjects, useFocusTask, TaskData } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { TodaysFocusCard } from "@/components/dashboard/todays-focus-card";
import { CreateProjectModal } from "@/components/project/create-project-modal";

function getFormattedDate(): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  return new Date().toLocaleDateString("id-ID", options);
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

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
                  {pinnedProjects.map((proj) => {
                    const tasks = proj.tasks || [];
                    const doneCount = tasks.filter((t: TaskData) => t.status === "done").length;
                    const totalCount = tasks.length;
                    const percent =
                      totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                    return (
                      <Link
                        key={proj.id}
                        href={`/projects/${proj.id}/board`}
                        className="p-4 bg-theme-surface border border-theme-default hover:border-theme-hover rounded-[8px] flex flex-col justify-between h-[96px] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: proj.color || "#7F9CF5" }}
                          />
                          <span className="text-[14px] font-medium text-theme-primary truncate">
                            {proj.name}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="w-full h-1 bg-theme-elevated rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: proj.color || "#7F9CF5",
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[12px] text-theme-secondary">
                            <span>
                              {doneCount}/{totalCount} done
                            </span>
                            <span className="font-mono">{percent}%</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
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
                  <Link
                    key={proj.id}
                    href={`/projects/${proj.id}/board`}
                    className="flex items-center justify-between px-2.5 py-2 rounded-[6px] hover:bg-theme-elevated transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: proj.color || "#68D391" }}
                      />
                      <span className="text-[14px] font-medium text-theme-primary/80 group-hover:text-theme-primary">
                        {proj.name}
                      </span>
                    </div>
                    <span className="text-[12px] font-mono text-theme-secondary">
                      recently updated
                    </span>
                  </Link>
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
