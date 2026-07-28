"use client";

import { useState, useCallback, useEffect } from "react";
import { MoreHorizontal, Pencil, Copy, Trash2, Palette, ChevronRight, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { TAG_COLOR_PALETTE } from "@/lib/tags";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateFocusQueries } from "@/lib/api/queries/use-workspace";

interface ColumnContextMenuProps {
  columnId: string;
  columnName: string;
  columnColor: string;
  columnBehavior?: "active" | "completed";
  projectId: string;
  onRefreshProject: () => void;
  onRenameTrigger: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

export function ColumnContextMenu({
  columnId,
  columnName,
  columnColor,
  columnBehavior = "active",
  projectId,
  onRefreshProject,
  onRenameTrigger,
  canMoveLeft = false,
  canMoveRight = false,
  onMoveLeft,
  onMoveRight,
}: ColumnContextMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileColorOpen, setMobileColorOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleColorChange = useCallback(async (color: string) => {
    if (color === columnColor) return;
    try {
      await api.updateColumn(columnId, { color });
      onRefreshProject();
    } catch {
      toast.error("Failed to update column color");
    }
    setMobileColorOpen(false);
  }, [columnId, columnColor, onRefreshProject]);

  const queryClient = useQueryClient();

  const handleToggleBehavior = useCallback(async () => {
    const isCompleted = columnBehavior === "completed";
    const nextBehavior = isCompleted ? "active" : "completed";
    try {
      await api.updateColumn(columnId, { behavior: nextBehavior });
      invalidateFocusQueries(queryClient);
      if (nextBehavior === "completed") {
        toast.success("Column marked as finished.");
      } else {
        toast.success("Column marked as active.");
      }
      onRefreshProject();
    } catch {
      toast.error("Failed to update column behavior");
    }
  }, [columnId, columnBehavior, onRefreshProject, queryClient]);

  const handleDuplicate = useCallback(async () => {
    try {
      await api.createColumn(projectId, {
        name: columnName + " (copy)",
        color: columnColor,
        behavior: columnBehavior,
      });
      onRefreshProject();
    } catch {
      toast.error("Failed to duplicate column");
    }
  }, [columnName, columnColor, columnBehavior, projectId, onRefreshProject]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!columnToDelete) return;
    try {
      await api.deleteColumn(columnToDelete);
      setColumnToDelete(null);
      onRefreshProject();
    } catch {
      toast.error("Failed to delete column");
    }
  }, [columnToDelete, onRefreshProject]);

  const trigger = (
    <button
      className="w-6 h-6 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated flex items-center justify-center transition-colors shrink-0"
      title="Column menu"
    >
      <MoreHorizontal className="w-3.5 h-3.5" />
    </button>
  );

  const isCompleted = columnBehavior === "completed";

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMenuOpen(true)}
          className="w-6 h-6 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated flex items-center justify-center transition-colors shrink-0"
          title="Column menu"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
        <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 bg-theme-surface rounded-t-xl border border-theme-default shadow-xl animate-in slide-in-from-bottom duration-300">
              {mobileColorOpen ? (
                <div className="p-4 space-y-3">
                  <button
                    onClick={() => setMobileColorOpen(false)}
                    className="text-xs text-theme-secondary hover:text-theme-primary transition-colors"
                  >
                    ← Back
                  </button>
                  <ColorSwatchPicker
                    selectedColor={columnColor}
                    onSelect={handleColorChange}
                    colors={TAG_COLOR_PALETTE}
                    label=""
                  />
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {canMoveLeft && (
                    <button
                      onClick={() => { onMoveLeft?.(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-theme-primary hover:bg-theme-hover rounded-md transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-brand-accent" />
                      Move Left
                    </button>
                  )}
                  {canMoveRight && (
                    <button
                      onClick={() => { onMoveRight?.(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-theme-primary hover:bg-theme-hover rounded-md transition-colors"
                    >
                      <ArrowRight className="w-4 h-4 text-brand-accent" />
                      Move Right
                    </button>
                  )}
                  <button
                    onClick={() => { onRenameTrigger(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-theme-primary hover:bg-theme-hover rounded-md transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-theme-secondary" />
                    Rename
                  </button>
                  <button
                    onClick={() => setMobileColorOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-theme-primary hover:bg-theme-hover rounded-md transition-colors"
                  >
                    <Palette className="w-4 h-4 text-theme-secondary" />
                    Color
                    <ChevronRight className="w-4 h-4 ml-auto text-theme-tertiary" />
                  </button>
                  <button
                    onClick={() => { handleDuplicate(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-theme-primary hover:bg-theme-hover rounded-md transition-colors"
                  >
                    <Copy className="w-4 h-4 text-theme-secondary" />
                    Duplicate Column
                  </button>

                  <div className="mx-3 my-1 h-px bg-theme-default" />

                  {/* Finished Column Toggle Item */}
                  <button
                    onClick={() => { handleToggleBehavior(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-theme-primary hover:bg-theme-hover rounded-md transition-colors font-medium"
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isCompleted ? "text-brand-accent" : "text-theme-tertiary"}`} />
                    <span>{isCompleted ? "Mark as active column" : "Mark as finished column"}</span>
                  </button>

                  <div className="mx-3 my-1 h-px bg-theme-default" />
                  <button
                    onClick={() => { setColumnToDelete(columnId); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-semantic-danger hover:bg-semantic-danger-subtle rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Column
                  </button>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <ConfirmModal
          isOpen={columnToDelete !== null}
          title="Delete Column"
          description={`Delete "${columnName}" and all its tasks? This action cannot be undone.`}
          confirmLabel="Delete"
          isDanger
          onConfirm={handleDeleteConfirm}
          onClose={() => setColumnToDelete(null)}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 w-56 max-w-[calc(100vw-2rem)] rounded-md bg-theme-elevated border border-theme-default p-1.5 shadow-xl animate-in fade-in duration-100"
            sideOffset={4}
            align="end"
          >
            {canMoveLeft && (
              <DropdownMenu.Item
                onSelect={() => onMoveLeft?.()}
                className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-theme-primary hover:bg-theme-hover rounded-sm outline-none cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-brand-accent" />
                Move Left
              </DropdownMenu.Item>
            )}
            {canMoveRight && (
              <DropdownMenu.Item
                onSelect={() => onMoveRight?.()}
                className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-theme-primary hover:bg-theme-hover rounded-sm outline-none cursor-pointer transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5 text-brand-accent" />
                Move Right
              </DropdownMenu.Item>
            )}
            {(canMoveLeft || canMoveRight) && (
              <DropdownMenu.Separator className="mx-2 my-1 h-px bg-theme-default" />
            )}

            <DropdownMenu.Item
              onSelect={() => onRenameTrigger()}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-theme-primary hover:bg-theme-hover rounded-sm outline-none cursor-pointer transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-theme-secondary" />
              Rename
            </DropdownMenu.Item>

            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-theme-primary hover:bg-theme-hover rounded-sm outline-none cursor-pointer transition-colors data-[state=open]:bg-theme-hover">
                <Palette className="w-3.5 h-3.5 text-theme-secondary" />
                Color
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-theme-tertiary" />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  className="z-50 rounded-md bg-theme-elevated border border-theme-default p-2 shadow-xl animate-in fade-in duration-100"
                  sideOffset={8}
                >
                  <ColorSwatchPicker
                    selectedColor={columnColor}
                    onSelect={(color) => { handleColorChange(color); setMenuOpen(false); }}
                    colors={TAG_COLOR_PALETTE}
                    label=""
                  />
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>

            <DropdownMenu.Item
              onSelect={() => { handleDuplicate(); }}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-theme-primary hover:bg-theme-hover rounded-sm outline-none cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-theme-secondary" />
              Duplicate Column
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="mx-2 my-1 h-px bg-theme-default" />

            {/* Finished Column Toggle Item */}
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                handleToggleBehavior();
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-theme-primary hover:bg-theme-hover rounded-sm outline-none cursor-pointer transition-colors"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? "text-brand-accent" : "text-theme-tertiary"}`} />
              <span>{isCompleted ? "Mark as active column" : "Mark as finished column"}</span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="mx-2 my-1 h-px bg-theme-default" />

            <DropdownMenu.Item
              onSelect={() => setColumnToDelete(columnId)}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-semantic-danger hover:bg-semantic-danger-subtle rounded-sm outline-none cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Column
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmModal
        isOpen={columnToDelete !== null}
        title="Delete Column"
        description={`Delete "${columnName}" and all its tasks? This action cannot be undone.`}
        confirmLabel="Delete"
        isDanger
        onConfirm={handleDeleteConfirm}
        onClose={() => setColumnToDelete(null)}
      />
    </>
  );
}
