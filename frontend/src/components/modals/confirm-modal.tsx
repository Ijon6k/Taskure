"use client";

import { X } from "lucide-react";
import { ModalContainer } from "@/components/ui/modal-container";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

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
          <IconButton
            icon={X}
            title="Close"
            onClick={onClose}
            className="-mr-1 -mt-1"
          />
        </div>

        {/* Description */}
        <p className="text-[13px] text-theme-secondary leading-relaxed">
          {description}
        </p>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? "danger" : "default"}
            size="md"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}
