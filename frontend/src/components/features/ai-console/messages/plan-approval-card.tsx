"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { Kanban, Eye, Check, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useUIStore } from "@/store/use-ui-store";
import { useAIConsoleStore } from "../store";
import type { ParsedImport } from "@/lib/workspace-backup";

export interface PlanPhase {
  name: string;
  tasks: Array<{
    title: string;
    description?: string;
    priority?: string;
  }>;
}

export function parsePlanDsl(dslStr: string): PlanPhase[] {
  const lines = dslStr.split("\n");
  const phases: PlanPhase[] = [];
  let currentPhase: PlanPhase | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("COL:")) {
      if (currentPhase && currentPhase.tasks.length > 0) {
        phases.push(currentPhase);
      }
      currentPhase = {
        name: trimmed.slice(4).trim(),
        tasks: [],
      };
    } else if (trimmed.startsWith("TASK:") && currentPhase) {
      const parts = trimmed.slice(5).trim().split("|");
      const priority = parts[0]?.trim() || "medium";
      const title = parts[1]?.trim() || "";
      const description = parts[2]?.trim() || "";

      if (title) {
        currentPhase.tasks.push({
          title,
          ...(description ? { description } : {}),
          ...(priority ? { priority } : {}),
        });
      }
    }
  }

  if (currentPhase && currentPhase.tasks.length > 0) {
    phases.push(currentPhase);
  }

  return phases;
}

function priorityColor(priority?: string): string {
  switch (priority?.toLowerCase()) {
    case "urgent":
      return "text-semantic-danger font-medium";
    case "high":
      return "text-amber-500 font-medium";
    case "medium":
      return "text-blue-400 font-medium";
    case "low":
    default:
      return "text-theme-tertiary";
  }
}

interface PlanApprovalCardProps {
  plan_dsl?: string;
  phases?: PlanPhase[];
}

export const PlanApprovalCard = memo(function PlanApprovalCard({
  plan_dsl,
  phases: rawPhases,
}: PlanApprovalCardProps) {
  const router = useRouter();
  const setStagedBoardPlan = useUIStore((s) => s.setStagedBoardPlan);
  const projectId = useAIConsoleStore((s) => s.projectId);
  const [accepted, setAccepted] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  const phases = plan_dsl ? parsePlanDsl(plan_dsl) : rawPhases || [];

  if (!phases || phases.length === 0) return null;

  const totalTasks = phases.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);

  const getParsedImport = (): ParsedImport => ({
    kind: "board",
    name: "AI Proposed Kanban Plan",
    columns: phases.map((phase) => ({
      name: phase.name,
      tasks: (phase.tasks || []).map((t) => ({
        title: t.title,
        ...(t.description !== undefined ? { description: t.description } : {}),
        ...(t.priority !== undefined ? { priority: t.priority } : {}),
      })),
    })),
  });

  const handlePreview = () => {
    // Only preview without marking as accepted
    setStagedBoardPlan(getParsedImport());
    if (projectId) {
      router.push(`/projects/${projectId}/board`);
    }
  };

  const handleAccept = () => {
    setStagedBoardPlan(getParsedImport());
    setAccepted(true);
    if (projectId) {
      router.push(`/projects/${projectId}/board`);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-theme-subtle bg-surface-l1 p-4 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-surface-l2 border border-theme-subtle text-brand-accent flex items-center justify-center shrink-0">
            <Kanban className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[13.5px] font-semibold text-theme-primary leading-tight">
              Proposed Kanban Plan
            </h4>
            <p className="text-[11.5px] text-theme-tertiary">
              <span className="text-theme-secondary font-medium">{phases.length} phases</span> · <span className="text-theme-secondary font-medium">{totalTasks} tasks</span>
            </p>
          </div>
        </div>

        <span className={`text-[11px] font-medium ${accepted ? "text-semantic-success" : "text-theme-tertiary"}`}>
          {accepted ? "Applied to Board" : "Plan Draft"}
        </span>
      </div>

      {/* Clean phase summary without chips */}
      <div className="space-y-1 py-1">
        {phases.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between text-[12.5px] py-0.5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-brand-accent" />
              <span className="font-medium text-theme-primary">{p.name}</span>
            </div>
            <span className="text-theme-tertiary text-[11.5px]">{p.tasks?.length || 0} tasks</span>
          </div>
        ))}
      </div>

      {/* Expandable tasks detail */}
      <div className="border-t border-theme-subtle/50 pt-2">
        <button
          onClick={() => setShowTasks(!showTasks)}
          className="flex items-center gap-1.5 text-[12px] text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
        >
          {showTasks ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>{showTasks ? "Hide task breakdown" : "View task breakdown"}</span>
        </button>

        {showTasks && (
          <div className="mt-2 space-y-3 max-h-56 overflow-y-auto pr-1 text-[12px]">
            {phases.map((phase, pIdx) => (
              <div key={pIdx} className="space-y-1">
                <div className="text-[11.5px] font-semibold text-theme-secondary uppercase tracking-wider">
                  {phase.name}
                </div>
                <div className="space-y-1 pl-2 border-l border-theme-subtle">
                  {phase.tasks.map((task, tIdx) => (
                    <div key={tIdx} className="flex items-start justify-between gap-2 py-0.5">
                      <span className="text-theme-primary leading-snug">{task.title}</span>
                      <span className={`shrink-0 text-[11px] capitalize ${priorityColor(task.priority)}`}>
                        {task.priority || "medium"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="pt-2 flex items-center justify-end gap-2 border-t border-theme-subtle">
        <button
          onClick={handlePreview}
          className="px-3 py-1.5 rounded-lg bg-surface-l2 hover:bg-surface-l3 text-theme-secondary hover:text-theme-primary text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-theme-subtle"
          title="Preview board layout without committing"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview on Board</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </button>

        {accepted ? (
          <div className="px-3 py-1.5 rounded-lg bg-semantic-success/10 text-semantic-success text-[12px] font-medium flex items-center gap-1.5 border border-semantic-success/20">
            <Check className="w-3.5 h-3.5" />
            <span>Applied</span>
          </div>
        ) : (
          <button
            onClick={handleAccept}
            className="px-3.5 py-1.5 rounded-lg bg-brand-accent hover:opacity-90 text-text-on-accent text-[12px] font-medium shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Plan to Board</span>
          </button>
        )}
      </div>
    </div>
  );
});
