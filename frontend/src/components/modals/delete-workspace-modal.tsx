"use client";

import { useState } from "react";
import { ModalContainer } from "@/components/ui/modal-container";

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
          <label className="text-[11px] font-mono text-theme-tertiary uppercase tracking-wider block">
            Type <span className="text-theme-primary font-semibold select-all font-mono">delete all my workspace</span>
          </label>
          <input
            type="text"
            value={typedPhrase}
            onChange={(e) => setTypedPhrase(e.target.value)}
            placeholder="delete all my workspace"
            className="w-full bg-surface-l3 border border-theme-subtle rounded-md px-3 py-1.5 text-[13px] font-mono text-theme-primary placeholder:text-theme-tertiary/40 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
            autoFocus
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-[13px] font-medium text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!isMatched || isDeleting}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:hover:bg-red-600 text-white font-medium text-[13px] rounded-md transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete workspace"}
          </button>
        </div>
      </form>
    </ModalContainer>
  );
}
