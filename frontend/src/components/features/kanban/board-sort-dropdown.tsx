"use client";

import { ArrowUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BoardFilterState } from "@/lib/filter-tasks";

interface BoardSortDropdownProps {
  filters: BoardFilterState;
  onChangeFilters: (filters: BoardFilterState) => void;
}

export function BoardSortDropdown({ filters, onChangeFilters }: BoardSortDropdownProps) {
  const sortOptions = [
    { key: "position", label: "Board order" },
    { key: "due_date", label: "Due date" },
    { key: "priority", label: "Priority" },
    { key: "title", label: "Title (A-Z)" },
    { key: "updated", label: "Recently updated" },
  ];

  const currentLabel = sortOptions.find((o) => o.key === filters.sortBy)?.label || "Sort";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="default" className="shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-theme-tertiary" />
          <span>Sort: {currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[180px]">
        <DropdownMenuLabel>Sort tasks by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortOptions.map((opt) => {
          const isSelected = filters.sortBy === opt.key;
          return (
            <DropdownMenuItem
              key={opt.key}
              onClick={() => onChangeFilters({ ...filters, sortBy: opt.key })}
              className="flex items-center justify-between text-xs cursor-pointer"
            >
              <span>{opt.label}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-brand-accent" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
