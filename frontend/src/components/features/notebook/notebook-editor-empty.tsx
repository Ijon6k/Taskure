"use client";

import { FilePlus } from "@phosphor-icons/react";

/**
 * Empty state shown when a project has no notebook page (or all were deleted).
 * Single CTA to create the first page — keeps the cold start to one click.
 */

interface NotebookEditorEmptyProps {
  onCreate: () => void;
}

export function NotebookEditorEmpty({ onCreate }: NotebookEditorEmptyProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
      <span className="text-xs font-medium text-theme-tertiary">
        Empty Notebook
      </span>
      <h3 className="text-2xl font-medium tracking-tight text-theme-primary">
        Start a new page
      </h3>
      <p className="text-[13px] text-theme-secondary max-w-sm">
        Notes, docs, checklists — everything is a markdown page you can edit right here.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium bg-brand-accent hover:opacity-90 text-black transition-all active:scale-[0.98] shadow-xs cursor-pointer"
      >
        <FilePlus className="w-4 h-4" />
        New page
      </button>
    </div>
  );
}