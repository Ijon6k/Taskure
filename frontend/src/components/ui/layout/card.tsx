"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`p-4 bg-surface-l3 border border-theme-subtle rounded-md shadow-elevation-l3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`text-[15px] font-semibold text-theme-primary normal-case tracking-tight ${className}`} {...props}>
      {children}
    </div>
  );
}
