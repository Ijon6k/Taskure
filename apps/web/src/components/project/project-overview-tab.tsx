"use client";

import { Edit3, CheckCircle2, LayoutGrid, Plus, Calendar, Tag, Target, ExternalLink } from "lucide-react";
import { ProjectData } from "@/lib/api";
import { computeTaskStats } from "@/lib/helpers";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";

interface ProjectOverviewTabProps {
  project: ProjectData | null;
  onEditClick: () => void;
  onSwitchTab?: (tab: "board") => void;
  onAddTask?: () => void;
}

export function ProjectOverviewTab({
  project,
  onEditClick,
  onSwitchTab,
}: ProjectOverviewTabProps) {
  if (!project) return null;

  const stats = computeTaskStats(project.columns || []);
  const urgentTask = stats.allTasks.find((t) => t.priority === "urgent") || stats.allTasks[0];
  const upcomingTasks = stats.allTasks.filter((t) => t.due_date && t.status !== "done").slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto p-8 text-[14px]">
      <div className="max-w-[840px] mx-auto space-y-9 font-sans">
        {/* OVERVIEW Header & Info */}
        <div className="space-y-4">
          <SectionHeader
            title="Overview"
            action={
              <button
                onClick={onEditClick}
                className="px-2.5 py-1 bg-theme-elevated hover:bg-theme-hover border border-theme-default rounded-[6px] text-[12px] text-theme-secondary hover:text-theme-primary flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3 h-3 text-brand-accent" />
                <span>Edit</span>
              </button>
            }
          />

          <div className="space-y-3">
            <p className="text-[14px] text-theme-primary/90 leading-relaxed font-normal">
              {project.description || "Redesign the public REST API to support the v2 schema and OAuth 2.1."}
            </p>

            <div className="flex items-start gap-2.5 text-[14px] text-theme-primary/80">
              <Target className="w-4 h-4 text-theme-secondary shrink-0 mt-0.5" />
              <span>Ship a stable, fully-documented v2 REST API with OAuth 2.1 before the end of Q3.</span>
            </div>

            {/* Status & Target Date */}
            <div className="flex items-center gap-4 pt-1 text-[12px]">
              <StatusBadge status={project.status || "active"} color={project.color || "#7F9CF5"} />
              <div className="flex items-center gap-1.5 text-theme-secondary font-mono">
                <Calendar className="w-3 h-3 text-theme-secondary" />
                <span>Sep 30</span>
              </div>
            </div>

            {/* Tags / Labels */}
            <div className="flex items-center gap-1.5 pt-1">
              {["api", "backend", "q3"].map((tag) => (
                <div
                  key={tag}
                  className="px-2 py-0.5 bg-theme-elevated border border-theme-subtle rounded-[4px] text-[11px] text-theme-secondary flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5 text-theme-secondary" />
                  <span>{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PROGRESS SECTION */}
        <div className="space-y-3">
          <SectionHeader title="Progress" />

          <div className="p-5 bg-theme-surface border border-theme-default rounded-[8px] space-y-5">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-theme-primary font-medium">{stats.completionPercent}% complete</span>
              <span className="text-theme-secondary font-mono text-[12px]">
                {stats.doneCount}/{stats.allTasks.length} tasks
              </span>
            </div>

            <ProgressBar percent={stats.completionPercent} />

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-4 gap-2.5 pt-1">
              <StatCard label="Backlog" value={stats.backlogCount} />
              <StatCard label="In Progress" value={stats.inProgressCount} />
              <StatCard label="Review" value={stats.reviewCount} />
              <StatCard label="Done" value={stats.doneCount} />
            </div>
          </div>
        </div>

        {/* TODAY'S FOCUS SECTION */}
        <div className="space-y-3">
          <SectionHeader title="Today's focus" />

          <div className="p-4 bg-theme-surface border border-theme-default rounded-[8px] flex items-center justify-between">
            <span className="text-[14px] font-medium text-theme-primary truncate">
              {urgentTask ? urgentTask.title : "Migrate pagination to cursor-based model"}
            </span>
            <PriorityBadge priority="urgent" />
          </div>
        </div>

        {/* UPCOMING DEADLINES & RECENTLY COMPLETED GRID */}
        <div className="grid grid-cols-2 gap-6">
          {/* Upcoming Deadlines */}
          <div className="space-y-3">
            <SectionHeader title="Upcoming deadlines" />
            <div className="space-y-2">
              {(upcomingTasks.length > 0
                ? upcomingTasks
                : [
                    { id: "1", title: "Implement auth refresh token rotation", date: "Jul 18" },
                    { id: "2", title: "Add rate limiting to public endpoints", date: "Jul 22" },
                    { id: "3", title: "Write OpenAPI 3.1 spec for v2", date: "Jul 25" },
                    { id: "4", title: "Migrate pagination to cursor-based model", date: "Jul 14" },
                    { id: "5", title: "Audit dark-mode contrast tokens", date: "Jul 15" },
                  ]
              ).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-[6px] hover:bg-theme-hover transition-colors text-[14px]"
                >
                  <span className="text-theme-primary/80 font-medium truncate pr-2">
                    {item.title}
                  </span>
                  <span className="text-[11px] font-mono text-theme-secondary shrink-0">
                    {item.due_date ? item.due_date.split("T")[0] : item.date || "Jul 18"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Completed */}
          <div className="space-y-3">
            <SectionHeader title="Recently completed" />
            <div className="space-y-2">
              {[
                { id: "c1", title: "Deprecate v1 /users endpoint" },
                { id: "c2", title: "OAuth 2.1 PKCE flow" },
              ].map((item) => (
                <div key={item.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[14px]">
                  <CheckCircle2 className="w-4 h-4 text-[#68D391] shrink-0" />
                  <span className="text-theme-secondary font-normal truncate">
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RESOURCES SECTION */}
        <div className="space-y-3">
          <SectionHeader title="Resources" />

          <div className="space-y-2">
            <div className="p-3 bg-theme-elevated border border-theme-subtle rounded-[6px] flex items-center justify-between text-[14px] text-theme-primary/90 hover:border-brand-accent transition-colors cursor-pointer group">
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4 text-theme-secondary group-hover:text-brand-accent transition-colors" />
                <span>Repository</span>
              </div>
            </div>

            <div className="p-3 bg-theme-elevated border border-theme-subtle rounded-[6px] flex items-center justify-between text-[14px] text-theme-primary/90 hover:border-brand-accent transition-colors cursor-pointer group">
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4 text-theme-secondary group-hover:text-brand-accent transition-colors" />
                <span>Documentation</span>
              </div>
            </div>

            <div className="p-3 bg-theme-elevated border border-theme-subtle rounded-[6px] flex items-center justify-between text-[14px] text-theme-secondary">
              <span>Owner</span>
              <span className="text-theme-primary font-medium">You</span>
            </div>

            <div className="p-3 bg-theme-surface border border-theme-subtle rounded-[6px] text-[14px] text-theme-secondary leading-relaxed">
              Coordinate the v1 deprecation timeline with the docs refresh so customers get one clear migration story.
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS SECTION */}
        <div className="space-y-3 pt-2">
          <SectionHeader title="Quick actions" />

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => onSwitchTab && onSwitchTab("board")}
              className="h-[42px] px-3 bg-theme-surface hover:bg-theme-hover border border-theme-default hover:border-brand-accent rounded-[6px] flex items-center justify-center gap-2 text-theme-secondary hover:text-theme-primary text-[14px] font-medium transition-colors"
            >
              <LayoutGrid className="w-4 h-4 text-brand-accent" />
              <span>Open board</span>
            </button>

            <button
              onClick={() => onSwitchTab && onSwitchTab("board")}
              className="h-[42px] px-3 bg-theme-surface hover:bg-theme-hover border border-theme-default hover:border-brand-accent rounded-[6px] flex items-center justify-center gap-2 text-theme-secondary hover:text-theme-primary text-[14px] font-medium transition-colors"
            >
              <Plus className="w-4 h-4 text-brand-accent" />
              <span>Add task</span>
            </button>

            <button
              onClick={onEditClick}
              className="h-[42px] px-3 bg-theme-surface hover:bg-theme-hover border border-theme-default hover:border-brand-accent rounded-[6px] flex items-center justify-center gap-2 text-theme-secondary hover:text-theme-primary text-[14px] font-medium transition-colors"
            >
              <Edit3 className="w-4 h-4 text-brand-accent" />
              <span>Edit details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
