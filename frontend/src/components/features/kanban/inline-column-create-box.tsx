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
      <div className="w-[calc(100vw-2.5rem)] md:w-[350px] md:min-w-[350px] shrink-0 self-start p-3 bg-surface-l2 border border-theme-subtle rounded-[6px] space-y-2.5 shadow-elevation-l2 animate-in fade-in duration-100 snap-center">
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
          className="w-full bg-surface-l1 border border-theme-subtle rounded-[5px] px-3 py-1.5 text-[13px] text-theme-primary placeholder:text-theme-tertiary outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/20 transition-all"
        />
        <div className="flex items-center justify-end gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={onCancelAdding}
            className="px-2.5 py-1 text-[12px] font-medium text-theme-secondary hover:text-theme-primary hover:bg-surface-l3 rounded-[5px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmitColumn}
            disabled={!newColumnName.trim() || isSubmitting}
            className="px-3 py-1 bg-brand-accent hover:bg-brand-accent-hover text-white text-[12px] font-medium rounded-[5px] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all disabled:opacity-40 cursor-pointer"
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
      className="w-[calc(100vw-2.5rem)] md:w-[350px] md:min-w-[350px] shrink-0 h-9 self-start border border-dashed border-theme-subtle hover:border-theme-default bg-surface-l1/40 hover:bg-surface-l2 rounded-[6px] flex items-center justify-center gap-2 text-theme-tertiary hover:text-theme-secondary text-[12px] font-medium transition-all group snap-center cursor-pointer"
    >
      <Plus className="w-3.5 h-3.5 text-theme-tertiary group-hover:text-theme-primary transition-colors" />
      <span>Add column</span>
    </button>
  );
}
