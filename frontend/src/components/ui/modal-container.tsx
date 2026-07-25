"use client";

import React from "react";

export interface ModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
  className?: string;
}

export function ModalContainer({
  isOpen,
  onClose,
  maxWidth = "max-w-[440px]",
  children,
  className = "",
}: ModalContainerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none">
      {/* Backdrop click listener */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Dialog Shell */}
      <div
        className={`relative z-10 w-full ${maxWidth} bg-surface-l5 border border-theme-default text-theme-primary rounded-md p-6 space-y-5 shadow-elevation-l5 animate-in fade-in zoom-in-95 duration-150 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
