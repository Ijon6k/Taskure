"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

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
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] animate-in fade-in-0 duration-150" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%]",
            "bg-surface-l5 border border-theme-strong text-theme-primary rounded-lg p-5 shadow-elevation-l5",
            "animate-in fade-in-0 zoom-in-95 duration-150 outline-none select-none",
            maxWidth,
            className
          )}
        >
          {/* Hidden title for accessible screen readers in case children define custom headers */}
          <Dialog.Title className="sr-only">Dialog</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
