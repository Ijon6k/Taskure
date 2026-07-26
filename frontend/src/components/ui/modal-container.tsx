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
  maxWidth = "max-w-[420px]",
  children,
  className = "",
}: ModalContainerProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      {/* Backdrop click listener */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Dialog Shell */}
      <div
        className={`relative z-10 w-full ${maxWidth} bg-surface-l3 border border-white/10 text-theme-primary rounded-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
