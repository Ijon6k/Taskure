"use client";

import { DownloadSimple, UploadSimple, ArrowCounterClockwise } from "@phosphor-icons/react";
import { BoardFilterState, DEFAULT_BOARD_FILTERS, countActiveFilters } from "@/lib/filter-tasks";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { BoardFilterPopover } from "./board-filter-popover";
import { BoardSortDropdown } from "./board-sort-dropdown";

interface BoardFilterToolbarProps {
  filters: BoardFilterState;
  onChangeFilters: (filters: BoardFilterState) => void;
  boardTags: string[]; // Dynamic board tags attached ONLY to tasks on this board
  onExportJson?: (() => void) | undefined;
  onImportJson?: (() => void) | undefined;
}

export function BoardFilterToolbar({
  filters,
  onChangeFilters,
  boardTags = [],
  onExportJson,
  onImportJson,
}: BoardFilterToolbarProps) {
  const activeCount = countActiveFilters(filters);

  const handleReset = () => {
    onChangeFilters(DEFAULT_BOARD_FILTERS);
  };

  return (
    <div className="w-full shrink-0 border-b border-theme-subtle select-none">
      <div className="px-3 md:px-6 py-2 flex items-center justify-between gap-1.5 md:gap-3 overflow-x-auto no-scrollbar scrollbar-none">
        {/* Left Controls: Search + Filter Popover + Sort Dropdown + Reset */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
          <SearchInput
            value={filters.searchQuery}
            onChange={(q) => onChangeFilters({ ...filters, searchQuery: q })}
            placeholder="Search tasks..."
            className="flex-1 min-w-[120px] sm:w-[200px]"
          />

          {/* Unified Filter Popover Button */}
          <BoardFilterPopover
            filters={filters}
            onChangeFilters={onChangeFilters}
            boardTags={boardTags}
          />

          {/* Dedicated Sort Control */}
          <BoardSortDropdown
            filters={filters}
            onChangeFilters={onChangeFilters}
          />

          {/* Active Filter Reset Trigger */}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-theme-secondary hover:text-theme-primary shrink-0"
              title="Reset all filters"
            >
              <ArrowCounterClockwise className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Right Actions: Export / Import JSON (Icon Only) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onExportJson && (
            <button
              type="button"
              onClick={onExportJson}
              title="Export JSON"
              aria-label="Export JSON"
              className="w-8 h-8 rounded-[6px] bg-surface-l2 hover:bg-surface-l3 text-theme-secondary hover:text-theme-primary border border-theme-subtle/50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <DownloadSimple className="w-4 h-4" />
            </button>
          )}

          {onImportJson && (
            <button
              type="button"
              onClick={onImportJson}
              title="Import JSON"
              aria-label="Import JSON"
              className="w-8 h-8 rounded-[6px] bg-surface-l2 hover:bg-surface-l3 text-theme-secondary hover:text-theme-primary border border-theme-subtle/50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <UploadSimple className="w-4 h-4 text-brand-accent" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
