"use client";

import React from "react";
import { Check } from "lucide-react";
import { TAG_COLOR_PALETTE } from "@/lib/tags";

export interface ColorSwatchPickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
  colors?: string[];
  label?: string;
  className?: string;
}

export function ColorSwatchPicker({
  selectedColor,
  onSelect,
  colors = TAG_COLOR_PALETTE,
  label = "Accent Color",
  className = "",
}: ColorSwatchPickerProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <span className="block text-[13px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
          {label}
        </span>
      )}
      <div className="flex items-center gap-3 pt-0.5 overflow-x-auto">
        {colors.map((hex) => {
          const isSelected = selectedColor.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onSelect(hex)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? "scale-110"
                  : "hover:scale-105 opacity-75 hover:opacity-100"
              }`}
              style={{
                backgroundColor: hex,
                boxShadow: isSelected ? `0 0 0 2px var(--surface-l3), 0 0 0 4px ${hex}` : undefined,
              }}
              title={`Color ${hex}`}
              aria-label={`Select color ${hex}`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
