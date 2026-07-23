"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { Plus, LayoutGrid, Sparkles, Search, Filter } from "lucide-react";
import { ColumnData, TaskData, useMoveTask, api } from "@/lib/api";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { TrashZone } from "./trash-zone";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { SearchInput } from "@/components/ui/search-input";

interface KanbanBoardProps {
  projectId: string;
  columns: ColumnData[];
  onTaskClick: (task: TaskData) => void;
  onRefreshProject?: () => void;
}

import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";
import { groupBy, sortBy } from "es-toolkit";
import { useUIStore } from "@/store/use-ui-store";

export function KanbanBoard({ projectId, columns, onTaskClick, onRefreshProject }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskData | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskData | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [isSubmittingCol, setIsSubmittingCol] = useState(false);
  const [isInitLoading, setIsInitLoading] = useState(false);

  // Search & Filter state from Zustand Store
  const { searchQuery, setSearchQuery, selectedTag, setSelectedTag } = useUIStore();

  useHotkeys("esc", () => {
    if (isAddingColumn) {
      setIsAddingColumn(false);
      setNewColumnName("");
    }
    if (taskToDelete) {
      setTaskToDelete(null);
    }
  });

  const moveTaskMutation = useMoveTask(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Collect all unique tags across all tasks
  const allTags = Array.from(
    new Set(
      columns
        .flatMap((c) => c.tasks || [])
        .flatMap((t) => (t.labels || []).map((lbl) => (typeof lbl === "string" ? lbl : lbl.name)))
    )
  );

  const handleInitDefaultColumns = async () => {
    if (isInitLoading) return;
    setIsInitLoading(true);
    try {
      await api.createColumn(projectId, { name: "Todo", color: "#6B7280" });
      await api.createColumn(projectId, { name: "In Progress", color: "#7F9CF5" });
      await api.createColumn(projectId, { name: "Done", color: "#68D391" });
      if (onRefreshProject) onRefreshProject();
    } catch (err) {
      alert("Failed to create default column template: " + (err as Error).message);
    } finally {
      setIsInitLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as TaskData;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const draggedTask = activeTask;
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !draggedTask) return;

    // Check if dropped onto Trash Drop Zone
    if (over.id === "trash-drop-zone") {
      setTaskToDelete(draggedTask);
      return;
    }

    const taskId = active.id as string;

    // Find target column
    let targetColumnId = "";
    let targetColumn: ColumnData | undefined;

    if (over.data.current?.column) {
      targetColumn = over.data.current.column as ColumnData;
      targetColumnId = targetColumn.id;
    } else if (over.data.current?.task) {
      const targetTask = over.data.current.task as TaskData;
      targetColumnId = targetTask.column_id;
      targetColumn = columns.find((c) => c.id === targetColumnId);
    }

    if (!targetColumnId || !targetColumn) return;

    // Determine target status
    const colNameLower = targetColumn.name.toLowerCase();
    let newStatus = "todo";
    if (colNameLower.includes("done") || colNameLower.includes("selesai")) {
      newStatus = "done";
    } else if (colNameLower.includes("progress") || colNameLower.includes("doing")) {
      newStatus = "in_progress";
    }

    // Perform move task API call
    moveTaskMutation.mutate(
      {
        id: taskId,
        data: {
          column_id: targetColumnId,
          position: 0,
          status: newStatus,
        },
      },
      {
        onSuccess: async () => {
          toast.success(`Task moved to ${targetColumn?.name || "column"}`);
          // If dropped into "Done" column, automatically mark ALL subtasks/checklist as completed!
          if (newStatus === "done") {
            try {
              const fullTask = await api.getTask(taskId);
              if (fullTask.checklist_items && fullTask.checklist_items.length > 0) {
                await Promise.all(
                  fullTask.checklist_items.map((item) =>
                    item.is_completed ? Promise.resolve() : api.updateChecklistItem(item.id, { is_completed: true })
                  )
                );
              }
            } catch {
              // Ignore background errors
            }
          }
          if (onRefreshProject) onRefreshProject();
        },
        onError: (err) => {
          toast.error("Failed to move task: " + err.message);
        },
      }
    );
  };

  const handleDeleteConfirmed = async () => {
    if (!taskToDelete) return;
    try {
      await api.deleteTask(taskToDelete.id);
      toast.success(`Task "${taskToDelete.title}" deleted`);
      setTaskToDelete(null);
      if (onRefreshProject) onRefreshProject();
    } catch (e) {
      toast.error("Failed to delete task: " + (e as Error).message);
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

  // Filter tasks per column based on search & active tag
  const filterTasks = (tasks: TaskData[]) => {
    return tasks.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const taskLabels = (t.labels || []).map((l) => (typeof l === "string" ? l : l.name).toLowerCase());
      const matchesTag = selectedTag === "all" || taskLabels.includes(selectedTag.toLowerCase());

      return matchesSearch && matchesTag;
    });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Board Search & Tag Filter Bar */}
        {columns.length > 0 && (
          <div className="px-6 py-2.5 bg-theme-surface border-b border-theme-subtle flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Filter tasks on board..."
                className="flex-1 !h-[32px] bg-theme-elevated"
              />
            </div>

            {/* Tag Filter Pills */}
            <div className="flex items-center gap-1.5 text-[12px] overflow-x-auto py-0.5">
              <span className="text-theme-tertiary flex items-center gap-1 shrink-0 font-medium">
                <Filter className="w-3 h-3 text-brand-accent" />
                <span>Tag:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedTag("all")}
                className={`px-2.5 py-0.5 rounded-[4px] text-[11px] font-medium capitalize transition-colors ${
                  selectedTag === "all"
                    ? "bg-brand-accent text-black font-semibold"
                    : "bg-theme-elevated text-theme-secondary hover:text-theme-primary"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-0.5 rounded-[4px] text-[11px] font-medium capitalize transition-colors ${
                    selectedTag === tag
                      ? "bg-brand-accent text-black font-semibold"
                      : "bg-theme-elevated text-theme-secondary hover:text-theme-primary"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="w-full h-full flex-1 flex gap-5 overflow-x-auto p-6 items-start select-none relative">
          {columns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-theme-surface border border-theme-default rounded-[12px] text-center space-y-4 max-w-md mx-auto my-12">
              <LayoutGrid className="w-10 h-10 text-brand-accent opacity-80" />
              <div className="space-y-1">
                <h3 className="text-[16px] font-medium text-theme-primary">Board is Empty</h3>
                <p className="text-[13px] text-theme-secondary">
                  Use the default column template to get started with your work.
                </p>
              </div>
              <button
                onClick={handleInitDefaultColumns}
                disabled={isInitLoading}
                className="px-4 py-2 bg-brand-accent hover:opacity-90 text-black text-[13px] font-medium rounded-[8px] flex items-center gap-2 transition-all shadow-accent-glow"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isInitLoading ? "Creating..." : "Use Template (Todo, In Progress, Done)"}</span>
              </button>
            </div>
          ) : (
            columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={filterTasks(col.tasks || [])}
                projectId={projectId}
                onTaskClick={onTaskClick}
                onRefreshProject={onRefreshProject || (() => {})}
              />
            ))
          )}

          {/* Inline New Column Creation Box */}
          {isAddingColumn ? (
            <div className="w-[320px] shrink-0 p-3 bg-theme-elevated border border-accent rounded-[10px] space-y-2.5 shadow-xl animate-in fade-in duration-100">
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
                className="w-full bg-theme-surface border border-theme-default rounded-[6px] px-3 py-1.5 text-[13px] text-theme-primary outline-none focus:border-brand-accent"
              />
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="px-2.5 py-1 text-[12px] text-theme-secondary hover:text-theme-primary rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateInlineColumn}
                  disabled={!newColumnName.trim() || isSubmittingCol}
                  className="px-3 py-1 bg-brand-accent text-black text-[12px] font-medium rounded hover:opacity-90 transition-colors disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            columns.length > 0 && (
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-[320px] h-[44px] shrink-0 border border-dashed border-theme-default hover:border-theme-hover rounded-[10px] flex items-center justify-center gap-2 text-theme-secondary hover:text-theme-primary bg-theme-surface/50 hover:bg-theme-elevated transition-all text-[13px] font-medium"
              >
                <Plus className="w-4 h-4 text-brand-accent" />
                <span>New Column</span>
              </button>
            )
          )}
        </div>

        <TrashZone isDragging={activeTask !== null} />

        <DragOverlay>
          {activeTask ? <KanbanCard task={activeTask} onClick={() => {}} /> : null}
        </DragOverlay>

        <ConfirmModal
          isOpen={taskToDelete !== null}
          title="Delete Task"
          description={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
          confirmLabel="Delete Task"
          isDanger={true}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setTaskToDelete(null)}
        />
      </div>
    </DndContext>
  );
}
