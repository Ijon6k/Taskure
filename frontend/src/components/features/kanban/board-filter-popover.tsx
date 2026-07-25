"use client";

import { useState } from "react";
import { Filter, Check, RotateCcw, Tag as TagIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BoardFilterState, DEFAULT_BOARD_FILTERS, countActiveFilters } from "@/lib/filter-tasks";
import { getTagStyle } from "@/lib/tags";

interface BoardFilterPopoverProps {
  filters: BoardFilterState;
  onChangeFilters: (filters: BoardFilterState) => void;
  boardTags: string[]; // Dynamically generated ONLY from tasks currently on this board
}

export function BoardFilterPopover({
  filters,
  onChangeFilters,
  boardTags = [],
}: BoardFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  const handleReset = () => {
    onChangeFilters({
      ...filters,
      selectedTag: "all",
      selectedPriority: "all",
      selectedDueDate: "all",
      selectedSubtasks: "all",
    });
  };

  const priorityOptions = [
    { key: "all", label: "All priorities" },
    { key: "urgent", label: "Urgent", color: "#EF4444" },
    { key: "high", label: "High", color: "#F97316" },
    { key: "medium", label: "Medium", color: "#F59E0B" },
    { key: "low", label: "Low", color: "#10B981" },
  ];

  const dueDateOptions = [
    { key: "all", label: "All dates" },
    { key: "overdue", label: "Overdue" },
    { key: "today", label: "Today" },
    { key: "this_week", label: "This week" },
    { key: "no_due_date", label: "No date" },
  ];

  const subtaskOptions = [
    { key: "all", label: "All subtasks" },
    { key: "has_subtasks", label: "Has subtasks" },
    { key: "completed", label: "Completed" },
    { key: "pending", label: "Pending" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="default" className="shrink-0">
          <Filter className="w-3.5 h-3.5 text-brand-accent" />
          <span>Filter</span>
          {activeCount > 0 && (
            <Badge variant="accent" className="ml-0.5 px-1.5 py-0 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[300px] max-h-[420px] overflow-y-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between text-xs font-medium text-theme-primary">
          <span>Filter tasks</span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-brand-accent hover:underline flex items-center gap-1 font-normal cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <Separator />

        {/* ── 1. TAGS SECTION (DYNAMIC BOARD TAGS ONLY) ── */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-theme-tertiary uppercase tracking-wider">
            Tags
          </div>
          {boardTags.length === 0 ? (
            <p className="text-[11px] text-theme-tertiary italic px-1">
              No active tags on current board.
            </p>
          ) : (
            <div className="space-y-0.5 max-h-[110px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => onChangeFilters({ ...filters, selectedTag: "all" })}
                className="w-full px-2 py-1 rounded-md hover:bg-surface-hover flex items-center justify-between transition-colors text-left text-xs text-theme-primary cursor-pointer"
              >
                <span>All tags</span>
                {filters.selectedTag === "all" && <Check className="w-3.5 h-3.5 text-brand-accent" />}
              </button>
              {boardTags.map((tag) => {
                const isSelected = filters.selectedTag.toLowerCase() === tag.toLowerCase();
                const style = getTagStyle(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      onChangeFilters({
                        ...filters,
                        selectedTag: isSelected ? "all" : tag,
                      })
                    }
                    className="w-full px-2 py-1 rounded-md hover:bg-surface-hover flex items-center justify-between transition-colors text-left text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: style.color }}
                      />
                      <span className="text-theme-primary truncate">{tag}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-accent" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* ── 2. PRIORITY SECTION ── */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-theme-tertiary uppercase tracking-wider">
            Priority
          </div>
          <div className="grid grid-cols-1 gap-0.5">
            {priorityOptions.map((opt) => {
              const isSelected = filters.selectedPriority === opt.key;

              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onChangeFilters({ ...filters, selectedPriority: opt.key })}
                  className="w-full px-2 py-1 rounded-md hover:bg-surface-hover flex items-center justify-between transition-colors text-left text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {opt.color && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    <span className="text-theme-primary">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-accent" />}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* ── 3. DUE DATE SECTION ── */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-theme-tertiary uppercase tracking-wider">
            Due Date
          </div>
          <div className="grid grid-cols-1 gap-0.5">
            {dueDateOptions.map((opt) => {
              const isSelected = filters.selectedDueDate === opt.key;

              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onChangeFilters({ ...filters, selectedDueDate: opt.key })}
                  className="w-full px-2 py-1 rounded-md hover:bg-surface-hover flex items-center justify-between transition-colors text-left text-xs cursor-pointer"
                >
                  <span className="text-theme-primary">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-accent" />}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* ── 4. SUBTASKS SECTION ── */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-theme-tertiary uppercase tracking-wider">
            Subtasks
          </div>
          <div className="grid grid-cols-1 gap-0.5">
            {subtaskOptions.map((opt) => {
              const isSelected = filters.selectedSubtasks === opt.key;

              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onChangeFilters({ ...filters, selectedSubtasks: opt.key })}
                  className="w-full px-2 py-1 rounded-md hover:bg-surface-hover flex items-center justify-between transition-colors text-left text-xs cursor-pointer"
                >
                  <span className="text-theme-primary">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-accent" />}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
