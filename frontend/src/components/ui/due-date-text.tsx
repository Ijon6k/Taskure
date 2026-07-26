"use client";

import { Calendar } from "lucide-react";
import { getFormattedDueDate } from "@/lib/utils/date";

interface DueDateTextProps {
  dateStr?: string | null | undefined;
  className?: string;
}

export function DueDateText({ dateStr, className = "" }: DueDateTextProps) {
  const formatted = getFormattedDueDate(dateStr);
  if (!formatted) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-normal leading-none shrink-0 ${formatted.colorClass} ${className}`}
    >
      <Calendar className="w-3 h-3 shrink-0 opacity-85" />
      <span>{formatted.text}</span>
    </span>
  );
}
