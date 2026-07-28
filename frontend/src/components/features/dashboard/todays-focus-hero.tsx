"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CheckSquare, Square, Loader2 } from "lucide-react";
import { FocusItem, api } from "@/lib/api";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { DueDateText } from "@/components/ui/due-date-text";
import { useTheme } from "@/components/providers/theme-provider";
import { WorkspaceStateCode } from "@/lib/helpers/workspace-state";
import { useUIStore } from "@/store/use-ui-store";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateFocusQueries } from "@/lib/api/queries/use-workspace";
import { toast } from "sonner";

interface TodaysFocusHeroProps {
  hero: FocusItem | null;
  loading: boolean;
  stateCode: WorkspaceStateCode;
  onOpenCreateProject?: () => void;
}

export function TodaysFocusHero({
  hero,
  loading,
  stateCode,
  onOpenCreateProject,
}: TodaysFocusHeroProps) {
  const { getProjectNavUrl } = useTheme();
  const setSelectedTaskId = useUIStore((s) => s.setSelectedTaskId);
  const queryClient = useQueryClient();

  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [togglingSubtaskId, setTogglingSubtaskId] = useState<string | null>(null);

  // ── Loading Skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full bg-surface-l2 rounded-xl p-8 animate-pulse space-y-4 min-h-[180px]">
        <div className="w-20 h-3 bg-surface-hover rounded" />
        <div className="w-2/3 h-7 bg-surface-hover rounded" />
        <div className="w-1/3 h-4 bg-surface-hover rounded" />
        <div className="w-28 h-9 bg-surface-hover rounded-md mt-2" />
      </div>
    );
  }

  // ── Fallback States (FRESH, ARCHIVED, EMPTY, CLEAR, PAUSED) ──────────────────
  if (!hero || !hero.task || !hero.project?.id) {
    return (
      <FallbackCard
        stateCode={stateCode}
        onOpenCreateProject={onOpenCreateProject}
      />
    );
  }

  // ── Active Hero (ACTIVE state) ───────────────────────────────────────────────
  const { task, project } = hero;
  const projectName = project?.name || "Project";
  const projectColor = project?.color || "#7F9CF5";
  const checklist = ("checklist" in task && task.checklist ? task.checklist : ("checklist_items" in task ? task.checklist_items : [])) || [];
  const checklistSummary = "checklist_summary" in task ? task.checklist_summary : undefined;

  // Handler: Complete task directly from Hero Card
  const handleMarkComplete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (completingTaskId) return;

    setCompletingTaskId(task.id);
    try {
      await api.updateTask(task.id, { status: "done" });
      toast.success(`Completed "${task.title}"!`);
      invalidateFocusQueries(queryClient);
    } catch (err) {
      toast.error("Failed to complete task: " + (err as Error).message);
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Handler: Toggle checklist item directly from Hero Card
  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (togglingSubtaskId) return;

    setTogglingSubtaskId(subtaskId);
    try {
      await api.updateChecklistItem(subtaskId, { is_completed: !currentCompleted });
      invalidateFocusQueries(queryClient);
      toast.success(currentCompleted ? "Subtask unchecked" : "Subtask completed!");
    } catch (err) {
      toast.error("Failed to update subtask: " + (err as Error).message);
    } finally {
      setTogglingSubtaskId(null);
    }
  };

  return (
    <div className="w-full bg-surface-l2 rounded-xl p-6 sm:p-8 space-y-5 relative overflow-hidden group/hero">
      {/* Subtle ambient gradient — only on active hero */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 88% 45%, var(--brand-accent) 0%, transparent 70%)",
          opacity: 0.06,
        }}
      />

      <div className="space-y-5 relative z-10">
        {/* Project tag + metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-theme-secondary">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: projectColor }}
            />
            <span>{projectName}</span>
            {hero.reason_tag && (
              <>
                <span className="text-theme-tertiary font-normal">·</span>
                <span className="text-theme-tertiary font-normal">{hero.reason_tag}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={task.priority} />
            <DueDateText dateStr={task.due_date} />
          </div>
        </div>

        {/* Task title — Click opens Task Drawer */}
        <button
          type="button"
          onClick={() => setSelectedTaskId(task.id)}
          className="text-left w-full group/title cursor-pointer"
        >
          <h2 className="text-xl sm:text-2xl font-semibold text-theme-primary group-hover/title:text-brand-accent transition-colors tracking-tight leading-snug max-w-[760px]">
            {task.title}
          </h2>
        </button>

        {/* Interactive Checklist preview */}
        {checklist && checklist.length > 0 && (
          <div className="space-y-1.5 max-w-[480px]">
            <div className="text-[11px] font-mono text-theme-tertiary uppercase tracking-wider">
              {checklist.filter((c) => c.is_completed).length}/{checklist.length} subtasks done
            </div>
            {checklist.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={(e) => handleToggleSubtask(item.id, item.is_completed, e)}
                disabled={togglingSubtaskId === item.id}
                className="flex items-center gap-2 text-xs hover:bg-surface-l3/50 px-2 py-1 -mx-2 rounded transition-colors w-full text-left cursor-pointer"
              >
                {togglingSubtaskId === item.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-accent shrink-0" />
                ) : item.is_completed ? (
                  <CheckSquare className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-theme-tertiary shrink-0" />
                )}
                <span
                  className={
                    item.is_completed
                      ? "line-through text-theme-tertiary"
                      : "text-theme-primary"
                  }
                >
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Checklist summary text fallback */}
        {(!checklist || checklist.length === 0) && checklistSummary && checklistSummary.total > 0 && (
          <div className="text-[12px] text-theme-tertiary">
            {checklistSummary.completed}/{checklistSummary.total} subtasks completed
          </div>
        )}

        {/* CTA */}
        <div className="pt-1 flex items-center gap-3">
          <Link
            href={getProjectNavUrl(task.project_id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-slate-950 text-xs font-semibold rounded-md transition-colors shadow-xs"
          >
            <span>Continue in {projectName}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Fallback Card ──────────────────────────────────────────────────────────────

function FallbackCard({
  stateCode,
  onOpenCreateProject,
}: {
  stateCode: WorkspaceStateCode;
  onOpenCreateProject?: (() => void) | undefined;
}) {
  let title: string;
  let subtitle: string;
  let cta: React.ReactNode = null;

  switch (stateCode) {
    case "FRESH":
      title = "Start something";
      subtitle = "Create a project to begin.";
      if (onOpenCreateProject) {
        cta = (
          <button
            type="button"
            onClick={onOpenCreateProject}
            className="px-3.5 py-2 bg-brand-accent hover:bg-brand-accent-hover text-slate-950 font-semibold text-xs rounded-md transition-colors cursor-pointer shadow-xs"
          >
            New project
          </button>
        );
      }
      break;

    case "ARCHIVED":
      title = "All projects archived";
      subtitle = "Restore or create an active project to surface priorities.";
      cta = (
        <Link
          href="/projects"
          className="px-3.5 py-2 bg-surface-l3 hover:bg-surface-hover text-theme-primary font-medium text-xs rounded-md transition-colors cursor-pointer"
        >
          View projects
        </Link>
      );
      break;

    case "EMPTY":
      title = "Ready when you are";
      subtitle = "Add your first task to any project.";
      cta = (
        <Link
          href="/projects"
          className="px-3.5 py-2 bg-brand-accent hover:bg-brand-accent-hover text-slate-950 font-semibold text-xs rounded-md transition-colors cursor-pointer shadow-xs"
        >
          Go to projects
        </Link>
      );
      break;

    case "PAUSED":
      title = "Focus is paused";
      subtitle = "No projects are included in today's focus.";
      cta = (
        <Link
          href="/projects"
          className="px-3.5 py-2 bg-surface-l3 hover:bg-surface-hover text-theme-primary font-medium text-xs rounded-md transition-colors cursor-pointer"
        >
          Go to projects
        </Link>
      );
      break;

    case "CLEAR":
    default:
      title = "All clear";
      subtitle = "Nothing needs your attention right now.";
      break;
  }

  return (
    <div className="w-full bg-surface-l2 rounded-xl p-8 flex flex-col justify-center min-h-[160px] space-y-4">
      <div className="space-y-1.5 max-w-[480px]">
        <h2 className="text-xl font-semibold text-theme-primary tracking-tight">
          {title}
        </h2>
        <p className="text-[13px] text-theme-secondary leading-relaxed">
          {subtitle}
        </p>
      </div>
      {cta && <div className="pt-1">{cta}</div>}
    </div>
  );
}
