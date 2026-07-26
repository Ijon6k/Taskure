"use client";

import { ArrowUpDown } from "lucide-react";
import { ColumnData } from "@/lib/api";

interface KanbanMobileTabBarProps {
  columns: ColumnData[];
  activeTabColId: string | null;
  onScrollToColumn: (colId: string) => void;
  onOpenReorderModal: () => void;
}

export function KanbanMobileTabBar({
  columns,
  activeTabColId,
  onScrollToColumn,
  onOpenReorderModal,
}: KanbanMobileTabBarProps) {
  if (columns.length === 0) return null;

  return (
    <div className="md:hidden flex items-center justify-between px-3 py-1.5 bg-theme-surface border-b border-theme-default shrink-0 z-10">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        {columns.map((col) => {
          const isSelected = activeTabColId === col.id;
          const taskCount = col.tasks?.length || 0;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => onScrollToColumn(col.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
                isSelected
                  ? "bg-brand-accent text-black font-semibold shadow-xs"
                  : "bg-theme-elevated text-theme-secondary hover:text-theme-primary"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: col.color || "#7F9CF5" }}
              />
              <span>{col.name}</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-brand-accent-subtle font-mono">
                {taskCount}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onOpenReorderModal}
        className="p-1.5 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors shrink-0 ml-1"
        title="Reorder Columns"
      >
        <ArrowUpDown className="w-4 h-4" />
      </button>
    </div>
  );
}
