"use client";

import { useEffect } from "react";
import { Robot, ArrowCounterClockwise, ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";

export default function AIError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AI console route error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-surface-l0 text-theme-primary font-sans select-none min-h-[60vh]">
      <div className="max-w-md w-full p-6 bg-surface-l2 border border-theme-subtle rounded-md space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-semantic-danger-subtle flex items-center justify-center mx-auto text-semantic-danger">
          <Robot className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-theme-primary tracking-tight">
            Failed to load AI Console
          </h2>
          <p className="text-[13px] text-theme-secondary leading-relaxed">
            {error?.message || "An unexpected error occurred while loading the AI console."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-brand-accent hover:opacity-90 text-on-accent font-medium text-[13px] rounded-md flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <ArrowCounterClockwise className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>

          <Link
            href="/projects"
            className="px-4 py-2 bg-surface-l3 hover:bg-surface-l4 text-theme-secondary hover:text-theme-primary font-medium text-[13px] rounded-md flex items-center gap-1.5 border border-theme-subtle transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Projects</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
