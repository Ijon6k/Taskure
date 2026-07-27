"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FocusItem } from "@/lib/api";
import { DueDateText } from "@/components/ui/due-date-text";

interface RecommendedNextSectionProps {
  recommendations: FocusItem[];
  loading?: boolean;
}

export function RecommendedNextSection({ recommendations, loading }: RecommendedNextSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading) {
    return (
      <div>
        <span className="text-[13px] font-semibold uppercase tracking-wide text-theme-tertiary block pb-2 border-b border-theme-subtle">
          Recommended next
        </span>
        <div className="space-y-1 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 animate-pulse">
              <div className="w-2 h-2 bg-surface-hover" />
              <div className="flex-1 h-4 bg-surface-hover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const validRecommendations = (recommendations || []).filter(
    (r) => r && r.task && r.project && r.project.id && r.project.name
  );

  if (!validRecommendations || validRecommendations.length === 0) return null;

  const displayedItems = isExpanded ? validRecommendations.slice(0, 10) : validRecommendations.slice(0, 3);
  const canExpand = validRecommendations.length > 3;

  return (
    <div>
      <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-theme-tertiary">
          Recommended next
        </span>
        {canExpand && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-[12px] text-theme-tertiary hover:text-theme-primary transition-colors"
          >
            {isExpanded ? "Less" : "More"}
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="mt-2 space-y-0.5">
        {displayedItems.map((item) => {
          const { task, project } = item;
          const projectName = project?.name || "Personal project";
          const projectColor = project?.color || "#7F9CF5";

          return (
            <Link
              key={task.id}
              href={`/projects/${task.project_id}/board`}
              className="flex items-start gap-2.5 px-2 py-2.5 rounded-[6px] hover:bg-surface-hover/40 transition-colors group/rec"
            >
              <span
                className="w-1.5 h-1.5 shrink-0 mt-[7px]"
                style={{ backgroundColor: projectColor }}
              />
              <div className="flex-1 min-w-0">
                <span className="block text-[15px] text-theme-secondary group-hover/rec:text-theme-primary transition-colors truncate">
                  {task.title}
                </span>
                <span className="text-[13px] text-theme-tertiary">{projectName}</span>
              </div>
              <DueDateText dateStr={task.due_date} className="!text-[13px] shrink-0 mt-[2px]" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
