"use client";

import { memo, useState } from "react";
import type { AIActivity } from "../store";
import { PlanApprovalCard } from "./plan-approval-card";

interface MessageActivitiesProps {
  activities: AIActivity[];
}

function formatToolName(name?: string): string {
  if (!name) return "Executing tool";
  switch (name) {
    case "kanban_generate_plan":
      return "Generating Kanban Board Plan";
    case "task_create":
      return "Creating Task";
    case "task_update":
      return "Updating Task";
    case "task_move":
      return "Moving Task";
    case "task_search":
      return "Searching Tasks";
    case "column_create":
      return "Creating Column";
    case "column_search":
      return "Searching Columns";
    case "project_get_board":
      return "Reading Kanban Board";
    case "project_get":
      return "Fetching Project Details";
    case "rag_search":
      return "Searching Project Knowledge Base (RAG)";
    case "project_clear_board":
      return "Clearing Project Kanban Board";
    case "notebook_create":
      return "Creating Notebook Page";
    case "notebook_update":
      return "Updating Notebook Page";
    case "notebook_get":
      return "Reading Notebook Page";
    case "notebook_search":
      return "Searching Notebook Pages";
    default:
      return name;
  }
}

function formatArguments(args?: Record<string, unknown>): string {
  if (!args || Object.keys(args).length === 0) return "";
  if (args.title && typeof args.title === "string") {
    return `"${args.title}"`;
  }
  if (args.name && typeof args.name === "string") {
    return `"${args.name}"`;
  }
  if (args.query && typeof args.query === "string") {
    return `query: "${args.query}"`;
  }
  if (args.phases && Array.isArray(args.phases)) {
    return `${args.phases.length} phases`;
  }
  return JSON.stringify(args);
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const MessageActivities = memo(function MessageActivities({
  activities,
}: MessageActivitiesProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!activities || activities.length === 0) return null;

  return (
    <div className="my-2 text-xs font-mono rounded-lg border border-theme-subtle bg-surface-l1 overflow-hidden transition-all duration-150">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-l2/50 hover:bg-surface-l2 text-theme-secondary text-[12px] font-medium transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 text-brand-accent transition-transform duration-200 ${
              isOpen ? "rotate-90" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            <span>Agent Steps & Tool Executions ({activities.length})</span>
          </span>
        </div>
        <span className="text-[11px] text-theme-tertiary">
          {isOpen ? "Hide details" : "Show details"}
        </span>
      </button>

      {isOpen && (
        <div className="p-2 space-y-2 divide-y divide-theme-subtle/50">
          {activities.map((act) => {
            const isPending = act.status === "pending" || act.status === "running";
            const isError = act.status === "error";
            const isSuccess = act.status === "success";
            const hasPlan =
              act.name === "kanban_generate_plan" &&
              act.arguments &&
              (typeof (act.arguments as any).plan_dsl === "string" ||
                Array.isArray((act.arguments as any).phases));

            return (
              <div key={act.id} className="pt-2 first:pt-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[12px] text-theme-primary font-medium truncate">
                    {/* Status Icon */}
                    {isPending && (
                      <span className="w-3 h-3 rounded-full border-2 border-brand-accent border-t-transparent animate-spin shrink-0" />
                    )}
                    {isSuccess && (
                      <svg
                        className="w-3.5 h-3.5 text-semantic-success shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                    {isError && (
                      <svg
                        className="w-3.5 h-3.5 text-semantic-danger shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}

                    <span>{formatToolName(act.name || act.details)}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-theme-tertiary">
                    {act.timestamp && <span>{formatTime(act.timestamp)}</span>}
                    {act.name && <span className="opacity-75">[{act.name}]</span>}
                  </div>
                </div>

                {/* Arguments / Payload snippet */}
                {act.arguments && !hasPlan && (
                  <div className="ml-5 text-[11px] text-theme-tertiary truncate">
                    {formatArguments(act.arguments)}
                  </div>
                )}

                {/* Plan Approval Card when kanban.generate_plan is executed */}
                {hasPlan && (
                  <div className="mt-1">
                    <PlanApprovalCard
                      plan_dsl={(act.arguments as any).plan_dsl}
                      phases={(act.arguments as any).phases}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
