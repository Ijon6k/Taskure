"use client";

import { useState } from "react";
import { DownloadSimple, PushPin, Trash } from "@phosphor-icons/react";
import type { NotebookPageDetailData } from "@/lib/api/types";
import { NOTEBOOK_TEXT_SIZES, useNotebookSettings, type NotebookTextSize } from "@/store/use-notebook-settings";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "./use-notebook-autosave";

/**
 * Persistent editor header: save indicator + pin / export / delete on the
 * left, text-size selector on the right.
 */

interface NotebookEditorHeaderProps {
  page: NotebookPageDetailData;
  saveStatus: SaveStatus;
  textSize: NotebookTextSize;
  onTogglePin: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function NotebookEditorHeader({
  page,
  saveStatus,
  textSize,
  onTogglePin,
  onExport,
  onDelete,
}: NotebookEditorHeaderProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { setTextSize } = useNotebookSettings();

  return (
    <>
      <header className="flex items-center justify-between gap-2 px-4 md:px-8 py-2 border-b border-theme-subtle shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <SaveIndicator status={saveStatus} />

          <IconButton
            title={page.is_pinned ? "Unpin page" : "Pin page"}
            ariaLabel={page.is_pinned ? "Unpin page" : "Pin page"}
            onClick={onTogglePin}
            className={cn(
              page.is_pinned && "text-brand-accent bg-brand-accent-subtle"
            )}
          >
            <PushPin className="w-4 h-4" />
          </IconButton>

          <IconButton title="Export as markdown" ariaLabel="Export as markdown" onClick={onExport}>
            <DownloadSimple className="w-4 h-4" />
          </IconButton>

          <IconButton
            title="Delete page"
            ariaLabel="Delete page"
            onClick={() => setConfirmOpen(true)}
            danger
          >
            <Trash className="w-4 h-4" />
          </IconButton>
        </div>

        <TextSizeSelector value={textSize} onChange={setTextSize} />
      </header>

      <ConfirmModal
        isOpen={confirmOpen}
        title="Delete page"
        description={`Delete "${page.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDanger
        onConfirm={onDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}

// ──────────────────────────── sub-components ──────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-theme-tertiary">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
        Saving
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-theme-tertiary">
        <span className="w-1.5 h-1.5 rounded-full bg-semantic-success" />
        Saved
      </span>
    );
  }
  return null;
}

function IconButton({
  title,
  ariaLabel,
  onClick,
  danger,
  className,
  children,
}: {
  title: string;
  ariaLabel: string;
  onClick: () => void;
  danger?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer",
        danger
          ? "text-semantic-danger hover:text-semantic-danger hover:bg-semantic-danger-subtle"
          : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover",
        className
      )}
    >
      {children}
    </button>
  );
}

function TextSizeSelector({
  value,
  onChange,
}: {
  value: NotebookTextSize;
  onChange: (size: NotebookTextSize) => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5 p-0.5 bg-surface-l2 border border-theme-subtle rounded-md shrink-0"
      role="group"
      aria-label="Text size"
    >
      {(Object.keys(NOTEBOOK_TEXT_SIZES) as NotebookTextSize[]).map((size) => (
        <button
          key={size}
          type="button"
          title={`Text size: ${size}`}
          aria-label={`Text size: ${size}`}
          aria-pressed={value === size}
          onClick={() => onChange(size)}
          className={cn(
            "w-6 h-6 rounded flex items-center justify-center font-semibold transition-colors cursor-pointer",
            value === size
              ? "text-brand-accent"
              : "text-theme-secondary hover:text-theme-primary"
          )}
        >
          <span
            className={cn(
              size === "sm" && "text-[10px]",
              size === "md" && "text-xs",
              size === "lg" && "text-sm"
            )}
          >
            A
          </span>
        </button>
      ))}
    </div>
  );
}