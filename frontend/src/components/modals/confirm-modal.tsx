"use client";

import { X } from "lucide-react";
import { ModalContainer } from "@/components/ui/modal-container";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDanger = true,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-[400px]">
      <div className="space-y-3.5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h2 className="text-base font-semibold text-theme-primary tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-lg text-theme-tertiary hover:text-theme-primary hover:bg-theme-elevated flex items-center justify-center transition-colors cursor-pointer -mr-1 -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-theme-secondary leading-relaxed">
          {description}
        </p>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer shadow-xs ${
              isDanger
                ? "bg-red-500/90 hover:bg-red-500 text-white"
                : "bg-brand-accent hover:opacity-90 text-black"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}
