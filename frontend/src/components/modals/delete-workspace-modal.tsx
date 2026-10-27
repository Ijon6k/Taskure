"use client";

import { useState } from "react";
import { ModalContainer } from "@/components/ui/modal-container";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void> | void;
}

const CONFIRMATION_PHRASE = "delete all my workspace";

export function DeleteWorkspaceModal({
  isOpen,
  onClose,
  onConfirmDelete,
}: DeleteWorkspaceModalProps) {
  const [typedPhrase, setTypedPhrase] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isMatched = typedPhrase.trim().toLowerCase() === CONFIRMATION_PHRASE;

  const handleClose = () => {
    setTypedPhrase("");
    setIsDeleting(false);
    onClose();
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched || isDeleting) return;

    setIsDeleting(true);
    try {
      await onConfirmDelete();
      handleClose();
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={handleClose} maxWidth="max-w-[400px]">
      <form onSubmit={handleConfirm} className="space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-[18px] font-medium tracking-tight text-theme-primary leading-snug">
            Delete workspace
          </h2>
          <p className="text-[13px] text-theme-secondary leading-relaxed">
            This will permanently delete all projects, columns, tasks, and tags. This action cannot be undone.
          </p>
        </div>

        {/* Verification Input Container */}
        <div className="space-y-2 p-3 bg-surface-l2 rounded-md border border-theme-subtle">
          <FormInput
            label="Type delete all my workspace to confirm"
            type="text"
            value={typedPhrase}
            onChange={(e) => setTypedPhrase(e.target.value)}
            placeholder="delete all my workspace"
            className="font-mono text-[13px]"
            autoFocus
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="danger"
            size="md"
            disabled={!isMatched || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete workspace"}
          </Button>
        </div>
      </form>
    </ModalContainer>
  );
}
