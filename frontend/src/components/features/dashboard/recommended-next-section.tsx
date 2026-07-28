"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, CheckSquare } from "lucide-react";
import { FocusItem } from "@/lib/api";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { DueDateText } from "@/components/ui/due-date-text";
import { useTheme } from "@/components/providers/theme-provider";

interface RecommendedNextSectionProps {
  recommendations: FocusItem[];
  loading?: boolean;
}

export function RecommendedNextSection({ recommendations, loading }: RecommendedNextSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { getProjectNavUrl } = useTheme();

  if (loading) {
    return (
      <div className="space-y-3">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-theme-tertiary block pb-2 border-b border-theme-subtle">
          Recommended next
        </span>
        <div className="space-y-1 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 animate-pulse">
              <div className="w-2 h-2 bg-surface-hover rounded-full" />
              <div className="flex-1 h-4 bg-surface-hover rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) return null;

  const displayedItems = isExpanded ? recommendations.slice(0, 10) : recommendations.slice(0, 3);
  const canExpand = recommendations.length > 3;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-theme-tertiary">
          Recommended next
        </span>
        {canExpand && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-[12px] text-theme-tertiary hover:text-theme-primary transition-colors cursor-pointer"
          >
            <span>{isExpanded ? "Less" : "More"}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="mt-2 space-y-1">
        {displayedItems.map((item) => {
          const { task, project } = item;
          const projectName = project?.name || "Project";
          const projectColor = project?.color || "#7F9CF5";
          const projectId = "project_id" in task ? task.project_id : project.id;
          const navUrl = getProjectNavUrl(projectId);
          const checklistSummary = "checklist_summary" in task ? task.checklist_summary : undefined;

          return (
            <Link
              key={task.id}
              href={navUrl}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-all group/rec cursor-pointer border border-transparent hover:border-theme-subtle"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className="w-2 h-2 shrink-0 rounded-full"
                  style={{ backgroundColor: projectColor }}
                />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-theme-secondary group-hover/rec:text-theme-primary transition-colors truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-theme-tertiary">
                    <span>{projectName}</span>
                    {item.reason_tag && (
                      <>
                        <span>·</span>
                        <span>{item.reason_tag}</span>
                      </>
                    )}
                    {checklistSummary && checklistSummary.total > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <CheckSquare className="w-3 h-3 text-theme-tertiary" />
                          {checklistSummary.completed}/{checklistSummary.total}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {task.priority && task.priority !== "low" && (
                  <PriorityBadge priority={task.priority} className="!text-[11px] !py-0.5" />
                )}
                <DueDateText dateStr={task.due_date} className="!text-[12px] shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
