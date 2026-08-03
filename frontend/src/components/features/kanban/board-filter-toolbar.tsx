"use client";

import { FileCode, DownloadSimple, UploadSimple, ArrowCounterClockwise } from "@phosphor-icons/react";
import { BoardFilterState, DEFAULT_BOARD_FILTERS, countActiveFilters } from "@/lib/filter-tasks";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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

          <BoardFilterPopover
            filters={filters}
            onChangeFilters={onChangeFilters}
            boardTags={boardTags}
          />

          <BoardSortDropdown
            filters={filters}
            onChangeFilters={onChangeFilters}
          />

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

        {/* Right: unified import/export menu (icon only) */}
        {(onExportJson || onImportJson) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Import / export JSON"
                aria-label="Import or export JSON"
                className="w-8 h-8 rounded-md bg-surface-l2 hover:bg-surface-l3 text-theme-secondary hover:text-theme-primary border border-theme-subtle flex items-center justify-center transition-colors cursor-pointer"
              >
                <FileCode className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[170px]">
              <DropdownMenuItem
                onClick={onExportJson}
                disabled={!onExportJson}
                className="flex items-center gap-2"
              >
                <DownloadSimple className="w-3.5 h-3.5 text-theme-secondary" />
                <span>Export JSON</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onImportJson}
                disabled={!onImportJson}
                className="flex items-center gap-2"
              >
                <UploadSimple className="w-3.5 h-3.5 text-theme-secondary" />
                <span>Import JSON</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
