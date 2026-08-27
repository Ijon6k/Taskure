"use client";

import { memo } from "react";
import { useAIConsoleStore, type ExecutionState } from "../store";

interface MessageProgressProps {
  executionState: ExecutionState;
}

const STATE_LABELS: Record<ExecutionState, string> = {
  idle: "Preparing…",
  streaming: "Responding…",
  "tool-call": "Using tools…",
  "context-retrieval": "Retrieving context…",
  analyzing: "Analyzing…",
  done: "Done",
  error: "Error",
};

export const MessageProgress = memo(function MessageProgress({
  executionState,
}: MessageProgressProps) {
  const progressDetail = useAIConsoleStore((s) => s.progressDetail);

  if (executionState === "idle" || executionState === "done") return null;

  const isError = executionState === "error";

  // Prefer the live detail from SSE (e.g. "Loading project memory…") over the
  // generic state label.
  const label =
    executionState === "context-retrieval" || executionState === "tool-call"
      ? progressDetail || STATE_LABELS[executionState]
      : STATE_LABELS[executionState];

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      {executionState === "streaming" ? (
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1 h-1 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1 h-1 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: "300ms" }} />
        </span>
      ) : (
        <div
          className={`w-1.5 h-1.5 rounded-full ${isError ? "bg-semantic-danger" : "bg-brand-accent"
            } ${executionState !== "error" ? "animate-pulse" : ""}`}
        />
      )}
      <span
        className={`text-xs font-mono ${isError ? "text-semantic-danger" : "text-theme-tertiary"
          }`}
      >
        {label}
      </span>
    </div>
  );
});
