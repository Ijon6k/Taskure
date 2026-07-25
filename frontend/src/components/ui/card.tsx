"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`p-4 bg-surface-l2 border border-theme-default rounded-md shadow-elevation-l3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`text-[12px] font-medium text-theme-secondary uppercase tracking-[0.60px] ${className}`} {...props}>
      {children}
    </div>
  );
}
