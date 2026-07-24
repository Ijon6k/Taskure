"use client";

import { useState, useEffect } from "react";
import { X, ArrowUp, ArrowDown, Check, LayoutGrid } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { ColumnData, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReorderColumnsModalProps {
  isOpen: boolean;
  columns: ColumnData[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ReorderColumnsModal({
  isOpen,
  columns: initialColumns,
  onClose,
  onSuccess,
}: ReorderColumnsModalProps) {
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setColumns([...initialColumns].sort((a, b) => a.position - b.position));
    }
  }, [isOpen, initialColumns]);

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const updated = [...columns];
    const itemA = updated[index];
    const itemB = updated[targetIndex];
    if (itemA && itemB) {
      updated[index] = itemB;
      updated[targetIndex] = itemA;
      setColumns(updated);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update position for each column
      await Promise.all(
        columns.map((col, idx) =>
          api.updateColumn(col.id, { position: idx })
        )
      );
      toast.success("Column order saved!");
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to save column order.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in duration-150" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-md bg-theme-surface border border-theme-default rounded-xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150 select-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-theme-default pb-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-brand-accent" />
              <Dialog.Title className="text-base font-semibold text-theme-primary">
                Reorder Columns
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-theme-secondary">
            Use the arrows to adjust column order for mobile and desktop.
          </p>

          {/* Vertical Column List */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {columns.map((col, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === columns.length - 1;

              return (
                <div
                  key={col.id}
                  className="flex items-center justify-between p-3 bg-theme-elevated border border-theme-default rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: col.color || "#7F9CF5" }}
                    />
                    <span className="font-medium text-theme-primary truncate">
                      {col.name}
                    </span>
                    <span className="text-xs text-theme-tertiary font-mono">
                      ({col.tasks?.length || 0})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(idx, "up")}
                      className="w-8 h-8 rounded-md bg-theme-surface border border-theme-default flex items-center justify-center text-theme-secondary hover:text-theme-primary disabled:opacity-30 disabled:hover:text-theme-secondary transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(idx, "down")}
                      className="w-8 h-8 rounded-md bg-theme-surface border border-theme-default flex items-center justify-center text-theme-secondary hover:text-theme-primary disabled:opacity-30 disabled:hover:text-theme-secondary transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-default">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>{isSaving ? "Saving..." : "Save Order"}</span>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
