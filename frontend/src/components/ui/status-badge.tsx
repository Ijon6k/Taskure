"use client";

interface StatusBadgeProps {
  status?: string;
  color?: string;
  className?: string;
}

export function StatusBadge({ status = "active", color = "#7F9CF5", className = "" }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-theme-elevated border border-theme-default text-theme-secondary text-[11px] font-medium capitalize ${className}`}>
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 shadow-accent-glow"
        style={{ backgroundColor: color }}
      />
      <span>{status}</span>
    </span>
  );
}
