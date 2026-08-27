"use client";

import { memo } from "react";
import { Sparkles, Kanban, BookOpen, Trash2, Search } from "lucide-react";
import type { AIMode } from "../store";
import { useAIConsoleStore } from "../store";

interface MessageEmptyStateProps {
  mode: AIMode;
}

const QUICK_PROMPTS = [
  {
    icon: Kanban,
    label: "Plan Kanban Board",
    desc: "Generate a 4-phase project plan",
    prompt: "Generate a 4-phase kanban board: Setup, Core API, Auth & Security, and Deployment.",
  },
  {
    icon: BookOpen,
    label: "Create Docs Page",
    desc: "Write architecture documentation",
    prompt: "Create a new notebook page titled 'Project Architecture' with full documentation.",
  },
  {
    icon: Trash2,
    label: "Clear Board",
    desc: "Wipe all tasks & columns",
    prompt: "Clear all tasks and columns in this project.",
  },
  {
    icon: Search,
    label: "Analyze Progress",
    desc: "Review current board status",
    prompt: "Analyze current board progress and summarize urgent tasks.",
  },
];

export const MessageEmptyState = memo(function MessageEmptyState({
  mode,
}: MessageEmptyStateProps) {
  const setInput = useAIConsoleStore((s) => s.setInput);

  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] h-full gap-4 text-center px-4 py-6 max-w-lg mx-auto">
      <div className="w-10 h-10 rounded-xl bg-surface-l2 text-theme-secondary flex items-center justify-center">
        <Sparkles className="w-5 h-5 opacity-80" />
      </div>

      <div className="space-y-1">
        <h2 className="text-[15px] font-semibold text-theme-primary tracking-tight">
          How can I help?
        </h2>
        <p className="text-[12px] text-theme-tertiary max-w-xs leading-relaxed">
          Select a quick suggestion or type a command below.
        </p>
      </div>

      {/* Quick Prompt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-1">
        {QUICK_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => setInput(item.prompt)}
              className="p-3 text-left rounded-xl bg-surface-l1/80 hover:bg-surface-l2 transition-all duration-150 group cursor-pointer focus:outline-none select-none"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Icon className="w-3.5 h-3.5 text-theme-tertiary group-hover:text-theme-primary transition-colors" />
                <span className="text-[12px] font-medium text-theme-primary">
                  {item.label}
                </span>
              </div>
              <p className="text-[11px] text-theme-tertiary line-clamp-1">
                {item.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
});
