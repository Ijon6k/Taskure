"use client";

import { getTagStyle } from "@/lib/tags";

interface TaskCardTagTextProps {
  tags: string[];
}

export function TaskCardTagText({ tags = [] }: TaskCardTagTextProps) {
  if (!tags || tags.length === 0) return null;

  const firstTag = tags[0] || "";
  const extraCount = tags.length - 1;
  const style = getTagStyle(firstTag);

  return (
    <div className="inline-flex items-center gap-1 text-[11px] font-medium tracking-tight truncate max-w-[150px]">
      <span className="truncate" style={{ color: style.color }}>
        {firstTag}
      </span>
      {extraCount > 0 && (
        <span className="text-theme-tertiary font-mono text-[10px] shrink-0 font-normal">
          +{extraCount}
        </span>
      )}
    </div>
  );
}
