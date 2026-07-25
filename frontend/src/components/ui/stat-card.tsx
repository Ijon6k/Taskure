"use client";

interface StatCardProps {
  label: string;
  value: number | string;
  color?: string;
  className?: string;
}

export function StatCard({ label, value, color, className = "" }: StatCardProps) {
  return (
    <div className={`p-3 bg-theme-elevated rounded-md space-y-1 ${className}`}>
      <div className="text-lg font-semibold text-theme-primary font-mono">{value}</div>
      <div className="text-xs font-medium text-theme-secondary flex items-center gap-1.5 truncate">
        {color && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}
