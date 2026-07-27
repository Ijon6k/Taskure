"use client";

import Link from "next/link";
import { ArrowRight, CheckSquare, Square, Sparkles, FolderPlus, HardDrive } from "lucide-react";
import { FocusItem, ChecklistItemData } from "@/lib/api";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { DueDateText } from "@/components/ui/due-date-text";
import { getFormattedDueDate } from "@/lib/utils/date";
import { useTheme } from "@/components/providers/theme-provider";

interface TodaysFocusHeroProps {
  hero: FocusItem | null;
  loading: boolean;
  onOpenCreateProject?: () => void;
}

function deriveReasons(task: FocusItem["task"]): string[] {
  const reasons: string[] = [];

  const priority = task.priority?.toLowerCase() || "";
  const dueDateStr = task.due_date;

  if (dueDateStr) {
    const parsed = new Date(dueDateStr);
    const now = new Date();
    if (!isNaN(parsed.getTime())) {
      const isOverdue = parsed < now && parsed.toDateString() !== now.toDateString();
      const isToday = parsed.toDateString() === now.toDateString();

      if (isOverdue) reasons.push("Overdue — needs immediate attention");
      else if (isToday) reasons.push("Due today — high priority completion");
    }
  }

  if (priority === "urgent") reasons.push("Highest priority across all projects");
  else if (priority === "high") reasons.push("High priority task");

  if (reasons.length === 0) reasons.push("Most impactful next step based on your workflow");

  return reasons;
}

export function TodaysFocusHero({ hero, loading, onOpenCreateProject }: TodaysFocusHeroProps) {
  const { getProjectNavUrl } = useTheme();

  if (loading) {
    return (
      <div className="w-full bg-surface-l2 rounded-md shadow-elevation-l3 p-8 lg:p-10 animate-pulse space-y-5 min-h-[260px]">
        <div className="w-24 h-3.5 bg-surface-l4 rounded" />
        <div className="w-3/4 h-8 bg-surface-l4 rounded" />
        <div className="w-1/2 h-4 bg-surface-l4 rounded" />
        <div className="w-36 h-11 bg-surface-l4 rounded-md mt-4" />
      </div>
    );
  }

  if (!hero || !hero.task || !hero.project || !hero.project.id || !hero.project.name) {
    return (
      <div className="w-full bg-surface-l2 rounded-md shadow-elevation-l3 p-8 sm:p-10 flex flex-col justify-center min-h-[260px] relative overflow-hidden space-y-5">
        {/* Aurora Atmospheric Glow Mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div
            className="absolute -top-[30%] -right-[10%] w-[500px] h-[340px] rounded-full blur-[70px] opacity-[0.14]"
            style={{
              background: "radial-gradient(circle, var(--brand-accent) 0%, rgba(168, 85, 247, 0.3) 50%, transparent 80%)",
            }}
          />
        </div>

        <div className="space-y-1.5 relative z-10 max-w-[540px]">
          <h2 className="text-[24px] sm:text-[28px] font-medium text-theme-primary tracking-tight leading-snug">
            Your canvas is wide open
          </h2>
          <p className="text-[14px] text-theme-secondary leading-relaxed">
            Create your first project to start organizing tasks, columns, and focus priorities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 pt-1">
          {onOpenCreateProject && (
            <button
              type="button"
              onClick={onOpenCreateProject}
              className="px-4 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-slate-950 font-semibold text-[13px] rounded-md flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create first project</span>
            </button>
          )}
          <Link
            href="/settings"
            className="px-4 py-2.5 bg-surface-l3 hover:bg-surface-l4 text-theme-primary font-medium text-[13px] rounded-md border border-theme-subtle flex items-center gap-2 transition-colors cursor-pointer"
          >
            <HardDrive className="w-4 h-4 text-theme-tertiary" />
            <span>Workspace settings</span>
          </Link>
        </div>
      </div>
    );
  }

  const { task, project } = hero;
  const projectName = project?.name || "Personal project";
  const projectColor = project?.color || "#7F9CF5";
  const checklist = task.checklist_items || [];
  const reasons = deriveReasons(task);

  return (
    <div className="w-full bg-surface-l2 rounded-md shadow-elevation-l3 p-8 lg:p-10 min-h-[260px] relative overflow-hidden">
      {/* Aurora Atmospheric Glow Mesh Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Aurora Primary Wave — Accent Glow */}
        <div
          className="absolute -top-[35%] -right-[10%] w-[550px] h-[380px] rounded-full blur-[70px] opacity-[0.15] transition-opacity duration-700"
          style={{
            background: "radial-gradient(circle, var(--brand-accent) 0%, rgba(168, 85, 247, 0.4) 50%, transparent 80%)",
          }}
        />
        {/* Aurora Secondary Wave — Cyan Sky Under-Glow */}
        <div
          className="absolute -bottom-[40%] right-[15%] w-[420px] h-[320px] rounded-full blur-[80px] opacity-[0.10] transition-opacity duration-700"
          style={{
            background: "radial-gradient(circle, #38BDF8 0%, rgba(59, 130, 246, 0.3) 50%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-theme-secondary">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: projectColor }} />
            <span>{projectName}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={task.priority} />
            <DueDateText dateStr={task.due_date} />
          </div>
        </div>

        {/* Task Title */}
        <h2 className="text-[26px] sm:text-[32px] font-medium text-theme-primary tracking-tight leading-tight max-w-[760px]">
          {task.title}
        </h2>

        {/* Derive Reasons */}
        {reasons.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {reasons.map((reason, i) => (
              <p key={i} className="text-[14px] text-theme-secondary flex items-center gap-2">
                <span className="w-3 h-0.5 bg-theme-tertiary/40 rounded-full" />
                <span>{reason}</span>
              </p>
            ))}
          </div>
        )}

        {/* Subtasks Checklist Preview */}
        {checklist.length > 0 && (
          <div className="pt-2 space-y-2 max-w-[500px]">
            <div className="text-[12px] font-mono text-theme-tertiary uppercase tracking-wider">
              Checklist ({checklist.filter((c) => c.is_completed).length}/{checklist.length})
            </div>
            {checklist.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 text-[14px]">
                {item.is_completed ? (
                  <CheckSquare className="w-4 h-4 text-brand-accent shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-theme-tertiary shrink-0" />
                )}
                <span className={item.is_completed ? "line-through text-theme-tertiary" : "text-theme-primary"}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link
          href={getProjectNavUrl(task.project_id)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-slate-950 text-[14px] font-semibold rounded-md transition-colors w-fit shadow-xs"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
