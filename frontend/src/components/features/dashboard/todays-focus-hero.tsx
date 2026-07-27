"use client";

import Link from "next/link";
import { ArrowRight, CheckSquare, Square } from "lucide-react";
import { FocusItem, ChecklistItemData } from "@/lib/api";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { DueDateText } from "@/components/ui/due-date-text";
import { getFormattedDueDate } from "@/lib/utils/date";

interface TodaysFocusHeroProps {
  hero: FocusItem | null;
  loading: boolean;
}

function deriveReasons(task: FocusItem["task"]): string[] {
  const reasons: string[] = [];
  const due = getFormattedDueDate(task.due_date);
  const priority = task.priority || "medium";

  if (due) {
    if (due.text.startsWith("Overdue")) reasons.push("Overdue — needs immediate attention");
    else if (due.text === "Today") reasons.push("Due today");
    else if (due.text === "Tomorrow") reasons.push("Due tomorrow");
    else if (due.text.startsWith("In")) reasons.push(`Due ${due.text.toLowerCase()}`);
  }

  if (priority === "urgent") reasons.push("Highest priority across all projects");
  else if (priority === "high") reasons.push("High priority task");

  if (reasons.length === 0) reasons.push("Most impactful next step based on your workflow");

  return reasons;
}

export function TodaysFocusHero({ hero, loading }: TodaysFocusHeroProps) {
  if (loading) {
    return (
      <div className="w-full bg-surface-l2 rounded-[12px] shadow-elevation-l3 p-8 lg:p-10 animate-pulse space-y-5 min-h-[260px]">
        <div className="w-24 h-3.5 bg-surface-l4 rounded" />
        <div className="w-3/4 h-8 bg-surface-l4 rounded" />
        <div className="w-1/2 h-4 bg-surface-l4 rounded" />
        <div className="w-36 h-11 bg-surface-l4 rounded-[8px] mt-4" />
      </div>
    );
  }

  if (!hero || !hero.task) {
    return (
      <div className="w-full bg-surface-l2 rounded-[12px] shadow-elevation-l3 p-8 lg:p-10 flex flex-col items-center justify-center text-center min-h-[260px] relative overflow-hidden">
        {/* Ambient gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 80% at 85% 50%, var(--brand-accent) 0%, transparent 70%)",
            opacity: 0.05,
          }}
        />
        <h2 className="text-[20px] font-semibold text-theme-primary tracking-tight relative">
          All caught up
        </h2>
        <p className="text-[15px] text-theme-secondary mt-3 max-w-[400px] leading-relaxed relative">
          No urgent tasks need your attention. Take a moment to plan ahead or review your projects.
        </p>
      </div>
    );
  }

  const { task, project } = hero;
  const projectName = project?.name || "Personal project";
  const projectColor = project?.color || "#7F9CF5";
  const checklist = task.checklist_items || [];
  const reasons = deriveReasons(task);

  return (
    <div className="w-full bg-surface-l2 rounded-[12px] shadow-elevation-l3 p-8 lg:p-10 min-h-[260px] relative overflow-hidden">
      {/* Ambient gradient on the right side */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 80% at 85% 50%, var(--brand-accent) 0%, transparent 70%)",
          opacity: 0.05,
        }}
      />

      <div className="flex flex-col gap-6 relative">
        {/* Project breadcrumb + priority + due date */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: projectColor }}
          />
          <Link
            href={`/projects/${task.project_id}/board`}
            className="text-[14px] font-medium text-theme-secondary hover:text-theme-primary transition-colors"
          >
            {projectName}
          </Link>
          <span className="text-theme-tertiary">·</span>
          <PriorityBadge priority={task.priority} />
          {task.due_date && (
            <>
              <span className="text-theme-tertiary">·</span>
              <DueDateText dateStr={task.due_date} className="!text-[13px]" />
            </>
          )}
        </div>

        {/* Task title — Hero scale */}
        <h2 className="text-[28px] sm:text-[34px] font-semibold text-theme-primary leading-[1.2] tracking-tight max-w-[640px]">
          {task.title}
        </h2>

        {/* Reasons as bullet list */}
        <ul className="space-y-1.5">
          {reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] text-theme-secondary leading-relaxed">
              <span className="text-theme-tertiary mt-[2px]">—</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>

        {/* Checklist preview */}
        {checklist.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-theme-subtle">
            {checklist.slice(0, 4).map((item: ChecklistItemData) => (
              <div key={item.id} className="flex items-center gap-2.5 text-[14px]">
                {item.is_completed ? (
                  <CheckSquare className="w-4 h-4 text-semantic-success shrink-0" />
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
          href={`/projects/${task.project_id}/board`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-on-accent text-[14px] font-medium rounded-[8px] transition-colors w-fit"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
