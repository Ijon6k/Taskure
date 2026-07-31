"use client";

import { Download, Upload, RotateCcw } from "lucide-react";
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
      <div className="px-3.5 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Left Controls: Search + Filter Popover + Sort Dropdown + Reset */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SearchInput
            value={filters.searchQuery}
            onChange={(q) => onChangeFilters({ ...filters, searchQuery: q })}
            placeholder="Search tasks..."
            className="w-full sm:w-[200px]"
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
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Right Actions: Export / Import JSON */}
        <div className="flex items-center gap-2 shrink-0">
          {onExportJson && (
            <Button variant="secondary" size="sm" onClick={onExportJson}>
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export JSON</span>
            </Button>
          )}

          {onImportJson && (
            <Button variant="secondary" size="sm" onClick={onImportJson}>
              <Upload className="w-3.5 h-3.5 text-brand-accent" />
              <span className="hidden sm:inline">Import JSON</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
