"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-surface-l0 text-theme-primary font-sans select-none min-h-[60vh]">
      <div className="max-w-md w-full p-6 bg-surface-l2 border border-theme-subtle rounded-xl space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-semantic-danger-subtle flex items-center justify-center mx-auto text-semantic-danger">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-theme-primary tracking-tight">
            Failed to load page content
          </h2>
          <p className="text-[13px] text-theme-secondary leading-relaxed">
            {error?.message || "An unexpected error occurred while rendering this page."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-brand-accent hover:opacity-90 text-on-accent font-medium text-[13px] rounded-md flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload View</span>
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
