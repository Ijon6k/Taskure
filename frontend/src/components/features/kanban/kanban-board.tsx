"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ColumnData, TaskData, api } from "@/lib/api";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { TrashZone } from "./trash-zone";
import { ReorderColumnsModal } from "./reorder-columns-modal";
import { EmptyBoardChoiceState } from "./empty-board-choice-state";
import { KanbanMobileTabBar } from "./kanban-mobile-tab-bar";
import { InlineColumnCreateBox } from "./inline-column-create-box";
import { useKanbanDnd } from "./hooks/use-kanban-dnd";
import { toast } from "sonner";

import { createPortal } from "react-dom";

const noop = () => {};

interface KanbanBoardProps {
  projectId: string;
  columns: ColumnData[];
  onTaskClick: (task: TaskData) => void;
  onRefreshProject?: () => void;
}

export function KanbanBoard({ projectId, columns: initialColumns, onTaskClick, onRefreshProject }: KanbanBoardProps) {
  const [columns, setColumns] = useState<ColumnData[]>(initialColumns);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [isSubmittingCol, setIsSubmittingCol] = useState(false);
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTabColId, setActiveTabColId] = useState<string | null>(initialColumns[0]?.id || null);

  // Sync internal state with props when data refreshes
  useEffect(() => {
    setColumns(initialColumns);
    if (initialColumns.length > 0 && !activeTabColId && initialColumns[0]?.id) {
      setActiveTabColId(initialColumns[0].id);
    }
  }, [initialColumns]);

  // Modular Dnd Hook
  const {
    sensors,
    activeTask,
    activeColumnId,
    columnIds,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useKanbanDnd({
    columns,
    setColumns,
    onRefreshProject,
  });

  const handleApplyStarterTemplate = async () => {
    if (isSubmittingTemplate) return;
    setIsSubmittingTemplate(true);
    try {
      const starterCols = [
        { name: "To Do", color: "#7F9CF5" },
        { name: "In Progress", color: "#F59E0B" },
        { name: "Done", color: "#10B981" },
      ];

      for (const col of starterCols) {
        await api.createColumn(projectId, col);
      }

      toast.success("Starter template columns created!");
      if (onRefreshProject) onRefreshProject();
    } catch (err) {
      toast.error("Failed to create starter columns: " + (err as Error).message);
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  const handleMoveColumn = useCallback(async (colId: string, direction: "left" | "right") => {
    const idx = columns.findIndex((c) => c.id === colId);
    if (idx === -1) return;
    const targetIdx = direction === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= columns.length) return;

    const newCols = arrayMove(columns, idx, targetIdx);
    setColumns(newCols);

    try {
      await Promise.all(
        newCols.map((c, i) =>
          api.updateColumn(c.id, { position: i })
        )
      );
      if (onRefreshProject) onRefreshProject();
    } catch {
      toast.error("Failed to move column.");
    }
  }, [columns, onRefreshProject]);

  const scrollToColumn = useCallback((colId: string) => {
    setActiveTabColId(colId);
    const colElement = document.getElementById(`kanban-column-${colId}`);
    if (colElement && containerRef.current) {
      colElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, []);

  const handleCreateInlineColumn = useCallback(async () => {
    if (!newColumnName.trim() || isSubmittingCol) return;
    setIsSubmittingCol(true);
    try {
      const created = await api.createColumn(projectId, {
        name: newColumnName.trim(),
        color: "#7F9CF5",
      });
      toast.success(`Column "${created.name}" created!`);
      setNewColumnName("");
      setIsAddingColumn(false);
      if (onRefreshProject) onRefreshProject();
    } catch (err) {
      toast.error("Failed to create column: " + (err as Error).message);
    } finally {
      setIsSubmittingCol(false);
    }
  }, [projectId, newColumnName, isSubmittingCol, onRefreshProject]);

  const handleOpenReorderModal = useCallback(() => setIsReorderModalOpen(true), []);
  const handleCloseReorderModal = useCallback(() => setIsReorderModalOpen(false), []);

  const handleReorderSuccess = useCallback(() => {
    if (onRefreshProject) onRefreshProject();
  }, [onRefreshProject]);

  // Stable refreshProject for columns — avoids breaking KanbanColumn memo
  const refreshProject = useMemo(() => onRefreshProject || noop, [onRefreshProject]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Mobile Sticky Column Selector Tab Bar */}
        <KanbanMobileTabBar
          columns={columns}
          activeTabColId={activeTabColId}
          onScrollToColumn={scrollToColumn}
          onOpenReorderModal={handleOpenReorderModal}
        />

        {/* Main Board Scroll Container */}
        <div
          ref={containerRef}
          className="w-full h-full flex-1 flex gap-4 md:gap-5 overflow-x-auto p-3.5 md:p-6 items-start select-none relative snap-x snap-mandatory md:snap-none"
        >
          {columns.length === 0 && !isAddingColumn ? (
            <EmptyBoardChoiceState
              onApplyStarterTemplate={handleApplyStarterTemplate}
              onSelectCreateBlank={() => setIsAddingColumn(true)}
              isSubmittingTemplate={isSubmittingTemplate}
            />
          ) : (
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
              {columns.map((col, idx) => (
                <div key={col.id} id={`kanban-column-${col.id}`} className="snap-center shrink-0 w-[calc(100vw-2rem)] md:w-80 max-w-full">
                  <KanbanColumn
                    column={col}
                    tasks={col.tasks || []}
                    projectId={projectId}
                    columnIndex={idx}
                    totalColumns={columns.length}
                    onMoveColumn={(dir) => handleMoveColumn(col.id, dir)}
                    onTaskClick={onTaskClick}
                    onRefreshProject={refreshProject}
                  />
                </div>
              ))}
            </SortableContext>
          )}

          {/* Inline New Column Creation Box */}
          <InlineColumnCreateBox
            isAddingColumn={isAddingColumn}
            newColumnName={newColumnName}
            isSubmitting={isSubmittingCol}
            hasColumns={columns.length > 0}
            onColumnNameChange={setNewColumnName}
            onStartAdding={() => setIsAddingColumn(true)}
            onCancelAdding={() => setIsAddingColumn(false)}
            onSubmitColumn={handleCreateInlineColumn}
          />
        </div>


        {/* Drag Overlays & Drop Trash Zone */}
        {typeof window !== "undefined" &&
          createPortal(
            <>
              <TrashZone isDragging={activeTask !== null} />

              <DragOverlay>
                {activeTask ? (
                  <div className="opacity-90 scale-105 shadow-2xl pointer-events-none rotate-1 w-72">
                    <KanbanCard task={activeTask} onClick={noop} />
                  </div>
                ) : activeColumnId ? (
                  <div className="opacity-95 scale-102 shadow-2xl pointer-events-none w-80">
                    {(() => {
                      const col = columns.find((c) => c.id === activeColumnId);
                      if (!col) return null;
                      return (
                        <KanbanColumn
                          column={col}
                          tasks={col.tasks || []}
                          projectId={projectId}
                          onTaskClick={noop}
                          onRefreshProject={noop}
                        />
                      );
                    })()}
                  </div>
                ) : null}
              </DragOverlay>
            </>,
            document.body
          )}

        {/* Reorder Columns Modal */}
        <ReorderColumnsModal
          isOpen={isReorderModalOpen}
          columns={columns}
          onClose={handleCloseReorderModal}
          onSuccess={handleReorderSuccess}
        />
      </div>
    </DndContext>
  );
}


