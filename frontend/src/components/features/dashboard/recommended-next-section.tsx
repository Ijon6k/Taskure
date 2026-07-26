"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowUpRight } from "lucide-react";
import { FocusItem } from "@/lib/api";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { DueDateText } from "@/components/ui/due-date-text";

interface RecommendedNextSectionProps {
  recommendations: FocusItem[];
  loading?: boolean;
}

export function RecommendedNextSection({ recommendations, loading }: RecommendedNextSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
          Recommended Next
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3.5 bg-theme-surface border border-theme-default rounded-md animate-pulse space-y-2"
            >
              <div className="w-24 h-3 bg-theme-elevated rounded" />
              <div className="w-2/3 h-5 bg-theme-elevated rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const displayedItems = isExpanded
    ? recommendations.slice(0, 10)
    : recommendations.slice(0, 3);

  const canExpand = recommendations.length > 3;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
          Recommended Next
        </div>
        {canExpand && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors py-0.5"
          >
            <span>{isExpanded ? "Show Less" : "Show More"}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {displayedItems.map((item) => {
          const { task, project } = item;
          const projectName = project?.name || "Personal Project";
          const projectColor = project?.color || "#7F9CF5";

          return (
            <Link
              key={task.id}
              href={`/projects/${task.project_id}/board`}
              className="group flex items-center justify-between p-3.5 bg-surface-l2 hover:bg-surface-l3 border border-theme-subtle rounded-md transition-all duration-150 hover:shadow-elevation-l1"
            >
              <div className="min-w-0 pr-3 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: projectColor }}
                  />
                  <span className="text-[11px] font-medium text-theme-secondary truncate">
                    {projectName}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-theme-primary group-hover:text-brand-accent transition-colors truncate">
                  {task.title}
                </h3>
                <DueDateText dateStr={task.due_date} />
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <PriorityBadge priority={task.priority} />
                <ArrowUpRight className="w-4 h-4 text-theme-tertiary group-hover:text-theme-primary transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
