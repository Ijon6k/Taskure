"use client";

import { Check } from "lucide-react";
import { ThemeMode } from "@/components/providers/theme-provider";

interface ThemePreviewCardProps {
  mode: ThemeMode;
  title: string;
  subtitle: string;
  badge?: string;
  isSelected: boolean;
  onSelect: () => void;
  accentColor: string;
}

const THEME_PALETTES: Record<ThemeMode, { canvas: string; sidebar: string; column: string; card: string; text: string; border: string }> = {
  graphite: {
    canvas: "#121316",
    sidebar: "#17181c",
    column: "#1d1e23",
    card: "#24252b",
    text: "#f4f4f6",
    border: "rgba(255, 255, 255, 0.08)",
  },
  dark: {
    canvas: "#000000",
    sidebar: "#09090b",
    column: "#121215",
    card: "#18181b",
    text: "#f4f4f6",
    border: "rgba(255, 255, 255, 0.08)",
  },
  light: {
    canvas: "#f5f5f6",
    sidebar: "#ededf0",
    column: "#e6e6eb",
    card: "#ffffff",
    text: "#09090b",
    border: "rgba(0, 0, 0, 0.06)",
  },
};

export function ThemePreviewCard({
  mode,
  title,
  subtitle,
  badge,
  isSelected,
  onSelect,
  accentColor,
}: ThemePreviewCardProps) {
  const palette = THEME_PALETTES[mode] || THEME_PALETTES.graphite;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group/theme p-4 rounded-md text-left transition-all duration-200 cursor-pointer space-y-3.5 relative ${
        isSelected
          ? "bg-surface-l3 ring-2 ring-brand-accent shadow-elevation-hover"
          : "bg-surface-l2 hover:bg-surface-l3 hover:shadow-elevation-l3"
      }`}
    >
      {/* Miniature Application Mockup */}
      <div
        className="w-full h-32 rounded-md p-2.5 flex gap-2 overflow-hidden transition-transform duration-200 group-hover/theme:scale-[1.01]"
        style={{ backgroundColor: palette.canvas, border: `1px solid ${palette.border}` }}
      >
        {/* Mini Sidebar */}
        <div
          className="w-8 h-full rounded-md p-1.5 flex flex-col gap-1.5 shrink-0"
          style={{ backgroundColor: palette.sidebar }}
        >
          <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: accentColor }} />
          <div className="w-full h-1 rounded-[1px] opacity-40" style={{ backgroundColor: palette.text }} />
          <div className="w-3/4 h-1 rounded-[1px] opacity-25" style={{ backgroundColor: palette.text }} />
        </div>

        {/* Mini Workspace Content Area */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Mini Header Bar */}
          <div
            className="w-full h-4 rounded-[4px] px-2 flex items-center justify-between"
            style={{ backgroundColor: palette.column }}
          >
            <div className="w-12 h-1 rounded-[1px] opacity-60" style={{ backgroundColor: palette.text }} />
            <div className="w-2.5 h-1 rounded-[1px]" style={{ backgroundColor: accentColor }} />
          </div>

          {/* Mini Kanban Columns */}
          <div className="flex-1 flex gap-1.5 min-w-0">
            <div
              className="flex-1 h-full rounded-md p-1.5 flex flex-col gap-1.5"
              style={{ backgroundColor: palette.column }}
            >
              <div className="w-7 h-1 rounded-[1px] opacity-50" style={{ backgroundColor: palette.text }} />
              <div
                className="w-full h-4 rounded-[3px] p-1 flex items-center"
                style={{ backgroundColor: palette.card }}
              >
                <div className="w-5 h-0.5 rounded-[1px]" style={{ backgroundColor: accentColor }} />
              </div>
              <div
                className="w-full h-3.5 rounded-[3px]"
                style={{ backgroundColor: palette.card }}
              />
            </div>

            <div
              className="flex-1 h-full rounded-md p-1.5 flex flex-col gap-1.5"
              style={{ backgroundColor: palette.column }}
            >
              <div className="w-6 h-1 rounded-[1px] opacity-50" style={{ backgroundColor: palette.text }} />
              <div
                className="w-full h-4 rounded-[3px]"
                style={{ backgroundColor: palette.card }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Label and Selected Indicator */}
      <div className="flex items-center justify-between pt-0.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold text-theme-primary">{title}</span>
            {badge && (
              <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-brand-accent/15 text-brand-accent">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[12px] text-theme-secondary mt-0.5">{subtitle}</p>
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-brand-accent flex items-center justify-center text-black shrink-0">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        )}
      </div>
    </button>
  );
}
