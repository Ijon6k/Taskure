"use client";

interface StatCardProps {
  label: string;
  value: number | string;
  className?: string;
}

export function StatCard({ label, value, className = "" }: StatCardProps) {
  return (
    <div className={`p-3 bg-theme-elevated rounded-[6px] space-y-1 ${className}`}>
      <div className="text-[18px] font-semibold text-theme-primary font-mono">{value}</div>
      <div className="text-[11px] font-medium text-theme-secondary">{label}</div>
    </div>
  );
}
