"use client";

import { X, Keyboard } from "lucide-react";
import { ModalContainer } from "@/components/ui/modal-container";
import { IconButton } from "@/components/ui/icon-button";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "N", description: "Create new project modal" },
  { key: "/", description: "Focus search bar" },
  { key: "Esc", description: "Cancel task/column creation or close modal" },
  { key: "?", description: "Toggle keyboard shortcuts guide" },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-subtle pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[6px] bg-brand-accent/10 flex items-center justify-center text-brand-accent">
            <Keyboard className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[16px] font-medium text-theme-primary tracking-tight">
              Keyboard Shortcuts
            </h2>
            <p className="text-[12px] text-theme-secondary">Quick navigation keys</p>
          </div>
        </div>
        <IconButton icon={X} variant="ghost" size="sm" onClick={onClose} />
      </div>

      {/* Shortcuts List */}
      <div className="space-y-2">
        {SHORTCUTS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-2.5 bg-surface-l4 border border-theme-subtle rounded-[8px] text-[13px]"
          >
            <span className="text-theme-primary/90 font-medium">{item.description}</span>
            <kbd className="px-2 py-1 bg-theme-elevated border border-theme-default rounded-[5px] text-[11px] font-mono text-brand-accent font-semibold shadow-xs">
              {item.key}
            </kbd>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="pt-2 border-t border-theme-subtle text-center text-[11px] text-theme-tertiary">
        Press <kbd className="px-1 py-0.5 bg-theme-elevated rounded border border-theme-subtle text-theme-secondary">Esc</kbd> anytime to close
      </div>
    </ModalContainer>
  );
}
