"use client";

import { useState } from "react";
import { CardHeader } from "@/components/ui/card";

export interface ColumnStatItem {
  id: string;
  name: string;
  color?: string;
  taskCount: number;
}

interface ColumnDistributionBarProps {
  columnStats: ColumnStatItem[];
  totalTasks: number;
  className?: string;
}

const DEFAULT_COLORS = [
  "#B4A0E5", // Lavender
  "#A0C4E8", // Pastel Blue
  "#E8B4C8", // Pastel Pink
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#22C55E", // Green
  "#8B5CF6", // Purple
  "#EC4899", // Pink
];

interface FormattedColumnStat {
  id: string;
  name: string;
  color: string;
  taskCount: number;
  percentage: number;
  percentageFormatted: number;
}

function ColumnDistributionRow({
  col,
  isHovered,
  isDimmed,
  onHover,
  onLeave,
}: {
  col: FormattedColumnStat;
  isHovered: boolean;
  isDimmed: boolean;
  onHover: (id: string) => void;
  onLeave: () => void;
}) {
  return (
    <div
      onMouseEnter={() => onHover(col.id)}
      onMouseLeave={onLeave}
      className={`flex items-center justify-between px-2.5 py-2 rounded-md transition-colors cursor-pointer text-sm ${isHovered
          ? "bg-white/[0.04] text-theme-primary"
          : isDimmed
            ? "opacity-35"
            : "hover:bg-white/[0.02] text-theme-secondary"
        }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-none shrink-0"
          style={{ backgroundColor: col.color }}
        />
        <span className="font-medium text-theme-primary truncate text-[14px]">
          {col.name}
        </span>
      </div>

      <div className="flex items-center gap-2.5 font-mono text-[13px] shrink-0">
        <span className="text-theme-primary font-medium">{col.taskCount}</span>
        <span className="text-theme-tertiary text-[12px] font-normal w-12 text-right">
          {col.percentageFormatted}%
        </span>
      </div>
    </div>
  );
}

export function ColumnDistributionBar({
  columnStats = [],
  totalTasks = 0,
  className = "",
}: ColumnDistributionBarProps) {
  const [hoveredColId, setHoveredColId] = useState<string | null>(null);

  // Normalize column stats with exact percentages
  const validStats: FormattedColumnStat[] = columnStats.map((col, idx) => {
    const fallbackColor = DEFAULT_COLORS[idx % DEFAULT_COLORS.length] || "#B4A0E5";
    const percent = totalTasks > 0 ? (col.taskCount / totalTasks) * 100 : 0;
    return {
      id: col.id,
      name: col.name,
      color: col.color || fallbackColor,
      taskCount: col.taskCount,
      percentage: percent,
      percentageFormatted: totalTasks > 0 ? Math.round(percent) : 0,
    };
  });

  return (
    <div className={`space-y-4 py-1 ${className}`}>
      {/* Section Header matching overall app design system */}
      <div className="flex items-center justify-between">
        <CardHeader>Progress</CardHeader>
        <span className="font-mono text-theme-secondary text-[13px] font-medium">
          {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
        </span>
      </div>

      {/* 100% Full-Width Square Rectangular Bar - Height Increased for Prominence */}
      <div className="w-full h-3.5 rounded-none bg-white/[0.06] overflow-hidden flex items-center gap-[2px]">
        {totalTasks === 0 ? (
          <div className="w-full h-full bg-white/[0.06]" />
        ) : (
          validStats.map((col) => {
            if (col.percentage <= 0) return null;
            const isHovered = hoveredColId === col.id;
            const isDimmed = hoveredColId !== null && !isHovered;

            return (
              <div
                key={col.id}
                onMouseEnter={() => setHoveredColId(col.id)}
                onMouseLeave={() => setHoveredColId(null)}
                title={`${col.name}: ${col.taskCount} tasks (${col.percentageFormatted}%)`}
                className={`h-full rounded-none transition-all duration-200 cursor-pointer ${isHovered
                    ? "opacity-100 scale-y-110"
                    : isDimmed
                      ? "opacity-25"
                      : "opacity-85 hover:opacity-100"
                  }`}
                style={{
                  width: `${col.percentage}%`,
                  backgroundColor: col.color,
                }}
              />
            );
          })
        )}
      </div>

      {/* Borderless Column Breakdown Rows with Clear Typography */}
      <div className="pt-0.5 space-y-1">
        {validStats.map((col) => (
          <ColumnDistributionRow
            key={col.id}
            col={col}
            isHovered={hoveredColId === col.id}
            isDimmed={hoveredColId !== null && hoveredColId !== col.id}
            onHover={setHoveredColId}
            onLeave={() => setHoveredColId(null)}
          />
        ))}
      </div>
    </div>
  );
}
