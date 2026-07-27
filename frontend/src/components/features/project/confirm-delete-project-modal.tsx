"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ModalContainer } from "@/components/ui/modal-container";
import { FormInput } from "@/components/ui/form-input";

interface ConfirmDeleteProjectModalProps {
  isOpen: boolean;
  projectName: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDeleteProjectModal({
  isOpen,
  projectName,
  isPending,
  onConfirm,
  onClose,
}: ConfirmDeleteProjectModalProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isMatch = inputValue === projectName;

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <ModalContainer isOpen={isOpen} onClose={() => !isPending && onClose()} maxWidth="max-w-[420px]">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-theme-primary tracking-tight">
              Delete project
            </h2>
            <p className="text-xs text-theme-secondary mt-0.5">
              This action is permanent and cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-6 h-6 rounded-md text-theme-tertiary hover:text-theme-primary hover:bg-theme-elevated flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 -mr-1 -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Details */}
        <p className="text-xs text-theme-secondary leading-relaxed bg-surface-l3/60 p-3 rounded-md border border-theme-subtle/50">
          This will permanently delete <strong className="text-theme-primary font-medium">{projectName}</strong> and all of its columns, tasks, and attachments.
        </p>

        {/* Confirmation Input */}
        <FormInput
          ref={inputRef}
          label={`Type "${projectName}" to confirm`}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={projectName}
          autoComplete="off"
          spellCheck={false}
          disabled={isPending}
          className={
            inputValue && !isMatch
              ? "!border-semantic-danger/50 focus:!border-semantic-danger"
              : ""
          }
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors disabled:opacity-30 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || isPending}
            className="px-4 py-1.5 bg-semantic-danger hover:bg-semantic-danger/90 text-white text-xs font-semibold rounded-md transition-all active:scale-98 disabled:opacity-40 flex items-center gap-2 shadow-xs cursor-pointer"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete project"
            )}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}
