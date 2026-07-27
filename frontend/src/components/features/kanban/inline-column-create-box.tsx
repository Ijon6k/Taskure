"use client";

import { Plus } from "lucide-react";

interface InlineColumnCreateBoxProps {
  isAddingColumn: boolean;
  newColumnName: string;
  isSubmitting: boolean;
  hasColumns: boolean;
  onColumnNameChange: (val: string) => void;
  onStartAdding: () => void;
  onCancelAdding: () => void;
  onSubmitColumn: () => void;
}

export function InlineColumnCreateBox({
  isAddingColumn,
  newColumnName,
  isSubmitting,
  hasColumns,
  onColumnNameChange,
  onStartAdding,
  onCancelAdding,
  onSubmitColumn,
}: InlineColumnCreateBoxProps) {
  if (isAddingColumn) {
    return (
      <div className="w-[calc(100vw-2rem)] md:w-80 shrink-0 p-3 bg-theme-elevated border border-accent rounded-md space-y-2.5 shadow-xl animate-in fade-in duration-100 snap-center">
        <input
          type="text"
          autoFocus
          value={newColumnName}
          onChange={(e) => onColumnNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmitColumn();
            if (e.key === "Escape") onCancelAdding();
          }}
          placeholder="Column name..."
          className="w-full bg-theme-surface border border-theme-default rounded-md px-3 py-2 text-xs text-theme-primary outline-none focus:border-brand-accent"
        />
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancelAdding}
            className="px-3 py-1.5 text-xs text-theme-secondary hover:text-theme-primary rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmitColumn}
            disabled={!newColumnName.trim() || isSubmitting}
            className="px-3.5 py-1.5 bg-brand-accent text-black text-xs font-semibold rounded hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    );
  }

  if (!hasColumns) return null;

  return (
    <button
      onClick={onStartAdding}
      className="w-[calc(100vw-2rem)] md:w-80 shrink-0 h-12 border border-dashed border-theme-default hover:border-theme-hover bg-theme-surface/30 hover:bg-theme-surface rounded-md flex items-center justify-center gap-2 text-theme-secondary hover:text-theme-primary text-xs font-medium transition-all group snap-center cursor-pointer"
    >
      <Plus className="w-4 h-4 text-brand-accent group-hover:scale-110 transition-transform" />
      <span>Add column</span>
    </button>
  );
}
