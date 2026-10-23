"use client";

import { memo } from "react";
import { useAIConsoleStore } from "./store";

const CATEGORIES: { key: "system" | "messages" | "tools" | "reasoning"; label: string; color: string }[] = [
  { key: "messages", label: "Messages", color: "var(--brand-accent)" },
  { key: "tools", label: "Tools", color: "var(--semantic-info)" },
  { key: "reasoning", label: "Reasoning", color: "#a78bfa" },
  { key: "system", label: "System", color: "var(--text-tertiary)" },
];

export const ContextPanel = memo(function ContextPanel() {
  const isOpen = useAIConsoleStore((s) => s.isContextPanelOpen);
  const setOpen = useAIConsoleStore((s) => s.setContextPanelOpen);
  const contextUsage = useAIConsoleStore((s) => s.contextUsage);

  if (!contextUsage) return null;

  const { used, total, breakdown } = contextUsage;
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
  const isWarning = percentage >= 80;

  return (
    <div className="border-t border-theme-subtle bg-surface-l1">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-theme-secondary">
            Context
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 rounded-full bg-surface-l3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isWarning ? "bg-semantic-warning" : "bg-brand-accent"
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <span
              className={`text-[11px] font-mono ${
                isWarning ? "text-semantic-warning" : "text-theme-tertiary"
              }`}
            >
              {percentage}%
            </span>
          </div>
        </div>
        <svg
          className={`w-3 h-3 text-theme-tertiary transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Collapsible breakdown */}
      {isOpen && (
        <div className="px-4 pb-3 pt-1 space-y-2">
          {/* Total count */}
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-theme-tertiary">Total tokens</span>
            <span className="text-theme-secondary font-mono">
              {used.toLocaleString()} / {total.toLocaleString()}
            </span>
          </div>

          {/* Category bars */}
          <div className="space-y-1.5">
            {CATEGORIES.map((cat) => {
              const val = breakdown[cat.key] || 0;
              const catPct = total > 0 ? (val / total) * 100 : 0;
              return (
                <div key={cat.key} className="flex items-center gap-2">
                  <span className="w-14 text-[11px] text-theme-tertiary truncate">
                    {cat.label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-surface-l3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(catPct, 100)}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-[11px] text-theme-tertiary font-mono">
                    {val.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          {isWarning && (
            <p className="text-[11px] text-semantic-warning pt-1">
              Approaching context limit. Consider starting a new conversation or
              summarizing previous messages.
            </p>
          )}
        </div>
      )}
    </div>
  );
});
