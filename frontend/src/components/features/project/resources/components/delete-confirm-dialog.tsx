"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  count: number;
  itemTitle?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  isOpen,
  count,
  itemTitle,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isBulk = count > 1;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-surface-l2 border border-theme-subtle rounded-md p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-semantic-danger-subtle flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-semantic-danger" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-theme-primary">
                {isBulk ? `Delete ${count} Assets?` : "Delete Asset?"}
              </h3>
              <p className="text-[13px] text-theme-tertiary pt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-theme-tertiary hover:text-theme-primary p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[13px] text-theme-secondary leading-relaxed bg-surface-l1 p-3 rounded-md border border-theme-subtle">
          {isBulk ? (
            <span>
              Are you sure you want to permanently delete <strong>{count} selected items</strong> from project resources?
            </span>
          ) : (
            <span>
              Are you sure you want to delete &quot;<strong>{itemTitle || "this asset"}</strong>&quot;?
            </span>
          )}
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-[13px] font-medium text-theme-secondary hover:text-theme-primary rounded-md transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 bg-semantic-danger hover:opacity-90 text-white text-[13px] font-medium rounded-md transition-opacity cursor-pointer shadow-xs"
          >
            {isBulk ? `Delete ${count} Assets` : "Delete Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}
