"use client";

import React from "react";
import { Tag as TagIcon, X } from "@phosphor-icons/react";
import { getTagConfig } from "@/lib/tags";

export interface TagChipProps {
  label: string;
  color?: string;
  onRemove?: (() => void) | undefined;
  onClick?: (() => void) | undefined;
  className?: string;
}

export function TagChip({
  label,
  color,
  onRemove,
  onClick,
  className = "",
}: TagChipProps) {
  const tagCfg = getTagConfig(label, color);

  return (
    <span
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-[12px] font-medium border inline-flex items-center gap-1.5 transition-colors group cursor-pointer ${className}`}
      style={{
        backgroundColor: tagCfg.bgSubtle,
        color: tagCfg.color,
        borderColor: tagCfg.borderSubtle,
      }}
    >
      <TagIcon className="w-3 h-3" />
      <span>{tagCfg.label}</span>
      {onRemove && (
        <X
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-3 h-3 opacity-60 group-hover:opacity-100 hover:text-red-400 transition-opacity cursor-pointer"
        />
      )}
    </span>
  );
}
