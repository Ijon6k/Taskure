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
  label = "Select Accent Color",
  className = "",
}: ColorSwatchPickerProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <span className="text-[11px] text-theme-tertiary font-mono uppercase tracking-[0.5px]">
          {label}:
        </span>
      )}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {colors.map((hex) => {
          const isSelected = selectedColor.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onSelect(hex)}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? "ring-2 ring-white ring-offset-1 ring-offset-surface-l3 scale-110"
                  : "hover:scale-105 opacity-80 hover:opacity-100"
              }`}
              style={{ backgroundColor: hex }}
            >
              {isSelected && <Check className="w-3 h-3 text-white font-bold" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
