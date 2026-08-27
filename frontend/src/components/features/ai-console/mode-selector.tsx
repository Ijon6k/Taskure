"use client";

import { useRef, useState, useEffect, memo } from "react";
import { useAIConsoleStore, type AIMode } from "./store";

interface ModeOption {
  id: AIMode;
  label: string;
  description: string;
}

const MODES: ModeOption[] = [
  {
    id: "fast",
    label: "Fast",
    description: "Quick, direct answers with minimal latency — no tools",
  },
  {
    id: "thinking",
    label: "Thinking",
    description: "Step-by-step reasoning before responding — read-only tools",
  },
  {
    id: "planning",
    label: "Plan",
    description: "Structured planning + can create/edit tasks, columns, notebooks",
  },
  {
    id: "agent",
    label: "Agent",
    description: "Autonomous execution with full tool access — create kanban, write notebooks",
  },
];

export const ModeSelector = memo(function ModeSelector() {
  const mode = useAIConsoleStore((s) => s.mode);
  const setMode = useAIConsoleStore((s) => s.setMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const active = container.querySelector("[data-mode-active]") as HTMLElement | null;
    if (!active) return;

    setIndicatorStyle({
      left: active.offsetLeft,
      width: active.offsetWidth,
    });
  }, [mode]);

  return (
    <div className="relative inline-flex items-center gap-0.5 p-1 rounded-xl bg-surface-l2/80 backdrop-blur-sm">
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-surface-l3 transition-all duration-200 ease-out"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      {MODES.map((opt) => (
        <button
          key={opt.id}
          data-mode-active={mode === opt.id || undefined}
          onClick={() => setMode(opt.id)}
          title={opt.description}
          className={`relative z-10 px-2.5 py-1 text-[12px] font-medium rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer select-none focus:outline-none focus-visible:ring-0 ${
            mode === opt.id
              ? "text-theme-primary font-semibold"
              : "text-theme-tertiary hover:text-theme-secondary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
});
