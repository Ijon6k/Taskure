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
    description: "Quick, direct answers with minimal latency",
  },
  {
    id: "thinking",
    label: "Thinking",
    description: "Step-by-step reasoning before responding",
  },
  {
    id: "planning",
    label: "Planning",
    description: "Structured planning and task decomposition",
  },
  {
    id: "agent",
    label: "Agent",
    description: "Autonomous execution with tool access",
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
    <div className="relative inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-l2 border border-theme-subtle">
      <div
        className="absolute top-0.5 bottom-0.5 rounded-md bg-surface-l3 border border-theme-default shadow-elevation-l3 transition-all duration-200 ease-out"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      {MODES.map((opt) => (
        <button
          key={opt.id}
          data-mode-active={mode === opt.id || undefined}
          onClick={() => setMode(opt.id)}
          title={opt.description}
          className={`relative z-10 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-150 whitespace-nowrap ${
            mode === opt.id
              ? "text-theme-primary"
              : "text-theme-tertiary hover:text-theme-secondary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
});
