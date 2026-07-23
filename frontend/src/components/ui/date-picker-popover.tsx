"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerPopoverProps {
  /** ISO 8601 date string, e.g. "2026-09-15" or full UTC ISO */
  value?: string | null;
  /** Called with ISO date string "YYYY-MM-DD" or null when cleared */
  onChange: (iso: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseDateSafe(value?: string | null): Date | null {
  if (!value) return null;
  try {
    // Handle both "YYYY-MM-DD" and full ISO strings
    const d = value.includes("T") ? parseISO(value) : new Date(value + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function DatePickerPopover({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
}: DatePickerPopoverProps) {
  const selectedDate = parseDateSafe(value);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(selectedDate ?? new Date());

  const handleSelectDay = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    onChange(iso);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Build calendar grid — weeks starting Monday
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const displayLabel = selectedDate
    ? format(selectedDate, "MMM d, yyyy")
    : null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!disabled) setOpen(nextOpen);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      {/* ── Trigger Button ── */}
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`
            group flex items-center gap-2 w-full px-3 py-2
            bg-theme-elevated border border-theme-default rounded-[6px]
            text-[13px] transition-colors cursor-pointer
            hover:border-brand-accent/50 focus:outline-none focus:border-brand-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${open ? "border-brand-accent" : ""}
          `}
        >
          <Calendar className="w-3.5 h-3.5 text-theme-tertiary flex-shrink-0 group-hover:text-brand-accent transition-colors" />
          <span className={displayLabel ? "text-theme-primary flex-1 text-left" : "text-theme-tertiary flex-1 text-left"}>
            {displayLabel ?? placeholder}
          </span>
          {displayLabel && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="text-theme-tertiary hover:text-red-400 transition-colors"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>
      </Popover.Trigger>

      {/* ── Calendar Popover ── */}
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="
            z-[200] w-[280px] rounded-[10px]
            bg-[#1E2024] border border-white/10
            shadow-[0_20px_60px_rgba(0,0,0,0.6)]
            animate-in fade-in-0 zoom-in-95 duration-150
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
          "
        >
          {/* Month Navigation Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <button
              type="button"
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#787878] hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-[13px] font-semibold text-white tracking-tight">
              {format(viewMonth, "MMMM yyyy")}
            </span>

            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#787878] hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week labels */}
          <div className="grid grid-cols-7 px-3 mb-1.5">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-[#555] uppercase tracking-[0.5px] py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-4">
            {allDays.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`
                    relative w-full aspect-square flex items-center justify-center
                    rounded-[6px] text-[12px] font-medium transition-all cursor-pointer
                    ${selected
                      ? "bg-brand-accent text-white shadow-md shadow-brand-accent/30"
                      : today
                        ? "text-brand-accent ring-1 ring-brand-accent/50 hover:bg-white/8"
                        : inMonth
                          ? "text-[#ccc] hover:bg-white/8 hover:text-white"
                          : "text-[#444] hover:bg-white/5"
                    }
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Footer: Today shortcut */}
          <div className="border-t border-white/8 px-4 py-2.5 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setViewMonth(today);
                handleSelectDay(today);
              }}
              className="text-[12px] text-[#787878] hover:text-white transition-colors cursor-pointer font-medium"
            >
              Today
            </button>
            <Popover.Close asChild>
              <button
                type="button"
                className="text-[12px] text-[#787878] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </Popover.Close>
          </div>

          <Popover.Arrow className="fill-white/10" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
