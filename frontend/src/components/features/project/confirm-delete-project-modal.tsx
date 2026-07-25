"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
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
    <ModalContainer isOpen={isOpen} onClose={() => !isPending && onClose()} maxWidth="max-w-[440px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-semantic-danger-subtle text-semantic-danger border border-semantic-danger/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-medium text-theme-primary tracking-tight">
              Delete project
            </h2>
            <p className="text-[12px] text-theme-secondary mt-0.5">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={isPending}
          className="w-7 h-7 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-surface-l3 flex items-center justify-center transition-colors disabled:opacity-30"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Warning */}
      <div className="bg-semantic-danger-subtle border border-semantic-danger/15 rounded-md p-3">
        <p className="text-[12px] text-theme-tertiary leading-relaxed">
          This will permanently delete <strong className="text-theme-primary">{projectName}</strong>{" "}
          and all of its columns, tasks, and data. You cannot undo this action.
        </p>
      </div>

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

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="px-3.5 py-2 rounded-md text-[14px] font-medium text-theme-secondary hover:text-theme-primary transition-colors disabled:opacity-30"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!isMatch || isPending}
          className="px-4 py-2 bg-semantic-danger hover:bg-red-600 text-white text-[14px] font-medium rounded-md transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Deleting...
            </>
          ) : (
            "Delete this project"
          )}
        </button>
      </div>
    </ModalContainer>
  );
}
