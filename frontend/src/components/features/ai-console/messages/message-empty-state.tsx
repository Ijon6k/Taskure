"use client";

import { memo } from "react";
import type { AIMode } from "../store";

interface MessageEmptyStateProps {
  mode: AIMode;
}

export const MessageEmptyState = memo(function MessageEmptyState({
  mode,
}: MessageEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <div className="text-[64px] leading-none select-none opacity-10">
        ◆
      </div>
      <h2 className="text-[15px] font-medium text-theme-secondary">
        Ask anything
      </h2>
      <p className="text-[13px] text-theme-tertiary max-w-xs leading-relaxed">
        Start a conversation with {mode} mode. Your project context is
        automatically included to give relevant, accurate responses.
      </p>
    </div>
  );
});
