"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  action,
  children,
  className = "",
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`space-y-2 pt-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px] hover:text-theme-primary transition-colors cursor-pointer select-none"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-theme-tertiary" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-theme-tertiary" />
          )}
          <span>{title}</span>
        </button>

        {action && <div>{action}</div>}
      </div>

      {/* Collapsible Content */}
      {isOpen && <div className="animate-in fade-in duration-150">{children}</div>}
    </div>
  );
}
