"use client";

import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
        {title}
      </span>
      {action}
    </div>
  );
}
