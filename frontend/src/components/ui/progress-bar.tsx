"use client";

interface ProgressBarProps {
  percent: number;
  color?: string;
  heightClass?: string;
  bgClass?: string;
}

export function ProgressBar({
  percent,
  color = "var(--brand-accent)",
  heightClass = "h-1",
  bgClass = "bg-[#1A1A1A]",
}: ProgressBarProps) {
  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <div className={`w-full ${bgClass} ${heightClass} rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-all duration-300 shadow-elevation-l3`}
        style={{ width: `${safePercent}%`, backgroundColor: color }}
      />
    </div>
  );
}
