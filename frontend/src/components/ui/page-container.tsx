"use client";

import React from "react";

export type PageContainerVariant = "default" | "wide" | "narrow" | "full";

interface PageContainerProps {
  children: React.ReactNode;
  variant?: PageContainerVariant;
  className?: string;
}

const VARIANT_MAP: Record<PageContainerVariant, string> = {
  narrow: "max-w-[672px]",   // Compact forms / focus view
  default: "max-w-[960px]",  // Dashboard, Settings, Project Overview
  wide: "max-w-[1120px]",    // Projects List, Catalogs
  full: "max-w-full",        // Full-width canvas
};

export function PageContainer({
  children,
  variant = "default",
  className = "",
}: PageContainerProps) {
  return (
    <div
      className={`w-full ${VARIANT_MAP[variant]} px-3.5 sm:px-8 py-4 sm:py-10 md:py-12 space-y-6 sm:space-y-10 ${className}`}
    >
      {children}
    </div>
  );
}
