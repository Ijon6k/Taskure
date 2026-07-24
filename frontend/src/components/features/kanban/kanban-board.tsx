"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Plus, LayoutGrid, ArrowUpDown } from "lucide-react";
import { ColumnData, TaskData, api } from "@/lib/api";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { TrashZone } from "./trash-zone";
import { ReorderColumnsModal } from "./reorder-columns-modal";
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
  const [activeTask, setActiveTask] = useState<TaskData | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [isSubmittingCol, setIsSubmittingCol] = useState(false);

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

  // TouchSensor configuration: 250ms long press with 5px tolerance prevents scrolling conflicts
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === "column") {
      setActiveColumnId(active.id as string);
    } else {
      const task = activeData?.task as TaskData;
      if (task) {
        setActiveTask(task);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumnId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if task dropped on Trash Zone
    if (overId === "trash-drop-zone") {
      const task = active.data.current?.task as TaskData;
      if (task) {
        try {
          await api.deleteTask(task.id);
          toast.success(`Task "${task.title}" deleted`);
          if (onRefreshProject) onRefreshProject();
        } catch {
          toast.error("Failed to delete task.");
        }
      }
      return;
    }

    const activeType = active.data.current?.type;

    // Column Reordering Drag logic
    if (activeType === "column") {
      if (activeId !== overId) {
        const oldIdx = columns.findIndex((c) => c.id === activeId);
        const newIdx = columns.findIndex((c) => c.id === overId);
        const newCols = arrayMove(columns, oldIdx, newIdx);

        setColumns(newCols);

        try {
          await Promise.all(
            newCols.map((c, idx) =>
              api.updateColumn(c.id, { position: idx })
            )
          );
          if (onRefreshProject) onRefreshProject();
        } catch {
          toast.error("Failed to reorder columns.");
        }
      }
      return;
    }

    // Task Dragging Logic
    const activeTaskData = active.data.current?.task as TaskData;
    if (!activeTaskData) return;

    const sourceColId = activeTaskData.column_id;
    let targetColId = sourceColId;
    let targetTaskPosition = 0;

    const overData = over.data.current;

    if (overData?.type === "column") {
      targetColId = overData.column.id;
      const targetCol = columns.find((c) => c.id === targetColId);
      targetTaskPosition = targetCol?.tasks?.length || 0;
    } else if (overData?.task) {
      const overTask = overData.task as TaskData;
      targetColId = overTask.column_id;
      const targetCol = columns.find((c) => c.id === targetColId);
      const overIdx = targetCol?.tasks?.findIndex((t) => t.id === overTask.id) ?? 0;
      targetTaskPosition = overIdx;
    }

    if (sourceColId === targetColId && activeId === overId) {
      return;
    }

    const targetCol = columns.find((c) => c.id === targetColId);
    const colNameLower = targetCol?.name.toLowerCase() || "";
    let newStatus = activeTaskData.status;

    if (colNameLower.includes("done") || colNameLower.includes("selesai")) {
      newStatus = "done";
    } else if (colNameLower.includes("progress") || colNameLower.includes("doing")) {
      newStatus = "in_progress";
    } else if (colNameLower.includes("todo") || colNameLower.includes("backlog")) {
      newStatus = "todo";
    }

    // Optimistic UI Update
    setColumns((prevCols) => {
      return prevCols.map((col) => {
        if (col.id === sourceColId && sourceColId === targetColId) {
          const tasks = [...(col.tasks || [])];
          const oldIdx = tasks.findIndex((t) => t.id === activeId);
          const newIdx = tasks.findIndex((t) => t.id === overId);
          if (oldIdx !== -1 && newIdx !== -1) {
            return { ...col, tasks: arrayMove(tasks, oldIdx, newIdx) };
          }
          return col;
        }

        if (col.id === sourceColId) {
          return {
            ...col,
            tasks: (col.tasks || []).filter((t) => t.id !== activeId),
          };
        }

        if (col.id === targetColId) {
          const tasks = [...(col.tasks || [])];
          const movedTask = {
            ...activeTaskData,
            column_id: targetColId,
            status: newStatus as TaskData["status"],
          };
          tasks.splice(targetTaskPosition, 0, movedTask);
          return { ...col, tasks };
        }

        return col;
      });
    });

    try {
      await api.moveTask(activeTaskData.id, {
        column_id: targetColId,
        position: targetTaskPosition,
        status: newStatus,
      });

      if (onRefreshProject) onRefreshProject();
    } catch (e) {
      toast.error("Failed to move task: " + (e as Error).message);
      if (onRefreshProject) onRefreshProject();
    }
  };

  const handleMoveColumn = async (colId: string, direction: "left" | "right") => {
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
  };

  const scrollToColumn = (colId: string) => {
    setActiveTabColId(colId);
    const colElement = document.getElementById(`kanban-column-${colId}`);
    if (colElement && containerRef.current) {
      colElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  const handleCreateInlineColumn = async () => {
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
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setActiveColumnId(null);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Mobile Sticky Column Selector Tab Bar */}
        {columns.length > 0 && (
          <div className="md:hidden flex items-center justify-between px-3 py-1.5 bg-theme-surface border-b border-theme-default shrink-0 z-10">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {columns.map((col) => {
                const isSelected = activeTabColId === col.id;
                const taskCount = col.tasks?.length || 0;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => scrollToColumn(col.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
                      isSelected
                        ? "bg-brand-accent text-black font-semibold shadow-xs"
                        : "bg-theme-elevated text-theme-secondary hover:text-theme-primary"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: col.color || "#7F9CF5" }}
                    />
                    <span>{col.name}</span>
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/10 font-mono">
                      {taskCount}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsReorderModalOpen(true)}
              className="p-1.5 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors shrink-0 ml-1"
              title="Reorder Columns"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Board Scroll Container */}
        <div
          ref={containerRef}
          className="w-full h-full flex-1 flex gap-4 md:gap-5 overflow-x-auto p-3.5 md:p-6 items-start select-none relative snap-x snap-mandatory md:snap-none"
        >
          {columns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 bg-theme-surface border border-theme-default rounded-xl text-center space-y-4 max-w-md mx-auto my-8 md:my-12">
              <LayoutGrid className="w-10 h-10 text-brand-accent opacity-80" />
              <div>
                <h3 className="text-base font-medium text-theme-primary">No columns created yet</h3>
                <p className="text-xs text-theme-secondary mt-1">
                  Start structuring your board by adding your first column.
                </p>
              </div>
              <button
                onClick={() => setIsAddingColumn(true)}
                className="px-4 py-2 bg-brand-accent text-black text-xs font-semibold rounded-md hover:opacity-90 transition-opacity"
              >
                + Add First Column
              </button>
            </div>
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
                    onRefreshProject={onRefreshProject || noop}
                  />
                </div>
              ))}
            </SortableContext>
          )}

          {/* Inline New Column Creation Box */}
          {isAddingColumn ? (
            <div className="w-[calc(100vw-2rem)] md:w-80 shrink-0 p-3 bg-theme-elevated border border-accent rounded-xl space-y-2.5 shadow-xl animate-in fade-in duration-100 snap-center">
              <input
                type="text"
                autoFocus
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateInlineColumn();
                  if (e.key === "Escape") setIsAddingColumn(false);
                }}
                placeholder="Column name..."
                className="w-full bg-theme-surface border border-theme-default rounded-md px-3 py-2 text-xs text-theme-primary outline-none focus:border-brand-accent"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="px-3 py-1.5 text-xs text-theme-secondary hover:text-theme-primary rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateInlineColumn}
                  disabled={!newColumnName.trim() || isSubmittingCol}
                  className="px-3.5 py-1.5 bg-brand-accent text-black text-xs font-semibold rounded hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            columns.length > 0 && (
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-[calc(100vw-2rem)] md:w-80 shrink-0 h-12 border border-dashed border-theme-default hover:border-theme-hover bg-theme-surface/30 hover:bg-theme-surface rounded-xl flex items-center justify-center gap-2 text-theme-secondary hover:text-theme-primary text-xs font-medium transition-all group snap-center"
              >
                <Plus className="w-4 h-4 text-brand-accent group-hover:scale-110 transition-transform" />
                <span>Add column</span>
              </button>
            )
          )}
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
          onClose={() => setIsReorderModalOpen(false)}
          onSuccess={() => {
            if (onRefreshProject) onRefreshProject();
          }}
        />
      </div>
    </DndContext>
  );
}
