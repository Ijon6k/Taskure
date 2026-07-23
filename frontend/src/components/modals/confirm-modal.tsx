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
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 className="text-[16px] font-medium text-[#F0F0F0] tracking-tight">
            {title}
          </h2>
        </div>
        <IconButton icon={X} variant="ghost" size="sm" onClick={onClose} />
      </div>

      <p className="text-[13px] text-[#A0A0A5] leading-relaxed">
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
