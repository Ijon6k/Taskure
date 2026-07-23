"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !isPending) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div
        className="w-full max-w-[440px] bg-[#121214] border border-white/10 rounded-[14px] p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-medium text-[#F0F0F0] tracking-tight">
                Delete project
              </h2>
              <p className="text-[12px] text-[#787878] mt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-7 h-7 rounded-[6px] text-[#787878] hover:text-[#F0F0F0] hover:bg-[#1C1C1E] flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning */}
        <div className="bg-red-500/5 border border-red-500/15 rounded-[8px] p-3">
          <p className="text-[12px] text-[#A0A0A5] leading-relaxed">
            This will permanently delete <strong className="text-[#F0F0F0]">{projectName}</strong>{" "}
            and all of its columns, tasks, and data. You cannot undo this action.
          </p>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-1.5">
          <label className="block text-[12px] font-medium text-[#787878] uppercase tracking-[0.5px]">
            Type &quot;{projectName}&quot; to confirm
          </label>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={projectName}
            autoComplete="off"
            spellCheck={false}
            disabled={isPending}
            className={`w-full h-[38px] px-3 bg-[#18181A] border rounded-[6px] text-[14px] text-[#F0F0F0] placeholder-[#525252] outline-none transition-colors disabled:opacity-40 ${
              inputValue && !isMatch
                ? "border-red-500/50 focus:border-red-500"
                : "border-white/8 focus:border-[#7F9CF5]"
            }`}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-3.5 py-2 rounded-[6px] text-[14px] font-medium text-[#787878] hover:text-[#F0F0F0] transition-colors disabled:opacity-30"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || isPending}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[14px] font-medium rounded-[6px] transition-colors disabled:opacity-40 flex items-center gap-2"
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
      </div>
    </div>
  );
}
