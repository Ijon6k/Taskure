"use client";

import { AlertTriangle, X } from "lucide-react";
import { ModalContainer } from "@/components/ui/modal-container";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";

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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${
              isDanger
                ? "bg-semantic-danger-subtle text-semantic-danger border border-semantic-danger/20"
                : "bg-semantic-info-subtle text-semantic-info border border-semantic-info/20"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 className="text-[16px] font-medium text-theme-primary tracking-tight">
            {title}
          </h2>
        </div>
        <IconButton icon={X} variant="ghost" size="sm" onClick={onClose} />
      </div>

      <p className="text-[13px] text-theme-tertiary leading-relaxed">
        {description}
      </p>

      <div className="pt-2 flex items-center justify-end gap-2.5">
        <Button variant="ghost" size="md" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={isDanger ? "danger" : "primary"}
          size="md"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </ModalContainer>
  );
}
