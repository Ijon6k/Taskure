"use client";

import Link from "next/link";
import { CheckSquare, Square, ArrowRight } from "lucide-react";
import { FocusResult, ChecklistItemData } from "@/lib/api";

interface TodaysFocusCardProps {
  focusData: FocusResult | null;
  loading: boolean;
}

export function TodaysFocusCard({ focusData, loading }: TodaysFocusCardProps) {
  if (loading) {
    return (
      <div className="w-full bg-theme-surface border border-theme-default rounded-md p-4 sm:p-5 animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-28 h-4 bg-theme-elevated rounded" />
          <div className="w-16 h-4 bg-theme-elevated rounded" />
        </div>
        <div className="w-3/4 h-6 bg-theme-elevated rounded" />
        <div className="w-full h-12 bg-theme-elevated rounded" />
      </div>
    );
  }

  if (!focusData || !focusData.task) {
    return (
      <div className="w-full bg-theme-surface border border-theme-default rounded-md p-6 text-center space-y-2">
        <h3 className="text-base font-medium text-theme-primary">All Tasks Completed! 🎉</h3>
        <p className="text-xs text-theme-secondary">
          No urgent tasks pending for today. Great job!
        </p>
      </div>
    );
  }

  const { task, project_name, project_color, reason } = focusData;
  const checklist = task.checklist_items || [];

  return (
    <div className="w-full bg-surface-l3 border border-theme-subtle rounded-md p-4 sm:p-5 space-y-4 shadow-elevation-l3">
      {/* Top Bar: Project Tag & Priority Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: project_color || "#7F9CF5" }}
            />
            <span className="text-[12px] font-medium text-theme-secondary truncate">
              {project_name}
            </span>
          </div>
          <h2 className="text-[16px] sm:text-[18px] font-medium text-theme-primary mt-1.5 leading-snug">
            {task.title}
          </h2>
        </div>

        <span className="px-2.5 py-1 rounded-md bg-semantic-danger-subtle text-semantic-danger text-[11px] font-medium shrink-0 border border-semantic-danger/20">
          {reason || (task.priority === "urgent" ? "Urgent" : task.priority)}
        </span>
      </div>

      {/* Checklist Preview */}
      {checklist.length > 0 && (
        <div className="py-2 border-y border-theme-default space-y-2 text-[13px] sm:text-[14px]">
          {checklist.slice(0, 3).map((item: ChecklistItemData) => (
            <div key={item.id} className="flex items-center gap-2.5">
              {item.is_completed ? (
                <CheckSquare className="w-[15px] h-[15px] text-semantic-success shrink-0" />
              ) : (
                <Square className="w-[15px] h-[15px] text-theme-tertiary shrink-0" />
              )}
              <span
                className={
                  item.is_completed
                    ? "line-through text-theme-secondary"
                    : "text-theme-primary/90"
                }
              >
                {item.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CTA Button */}
      <div>
        <Link
          href={`/projects/${task.project_id}/board`}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-brand-accent hover:opacity-90 active:scale-95 text-black text-[13px] sm:text-[14px] font-medium rounded-md transition-all shadow-sm"
        >
          <span>Continue working</span>
          <ArrowRight className="w-[15px] h-[15px]" />
        </Link>
      </div>
    </div>
  );
}
