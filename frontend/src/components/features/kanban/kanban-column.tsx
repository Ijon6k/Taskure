"use client";

import { useState, useMemo, memo, useRef, useEffect, useCallback } from "react";
import { useDndContext } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { Plus, GripVertical } from "lucide-react";
import { ColumnData, TaskData, api } from "@/lib/api";
import { KanbanCard } from "./kanban-card";
import { ColumnContextMenu } from "./column-context-menu";
import { extractTaskTags } from "@/lib/tags";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";
import { useUIStore } from "@/store/use-ui-store";

interface KanbanColumnProps {
  column: ColumnData;
  tasks: TaskData[];
  projectId: string;
  columnIndex?: number;
  totalColumns?: number;
  onMoveColumn?: (direction: "left" | "right") => void;
  onTaskClick: (task: TaskData) => void;
  onRefreshProject: () => void;
}

function KanbanColumnInner({
  column,
  tasks,
  projectId,
  columnIndex = 0,
  totalColumns = 1,
  onMoveColumn,
  onTaskClick,
  onRefreshProject,
}: KanbanColumnProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: column.id,
    data: { type: "column", column },
  });

  const { active } = useDndContext();
  const isColumnDragging = active?.data.current?.type === "column";

  const searchQuery = useUIStore((s) => s.searchQuery);
  const selectedTag = useUIStore((s) => s.selectedTag);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [isAdding, setIsAdding] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useHotkeys("esc", () => {
    if (isAdding) {
      setIsAdding(false);
      setTaskTitle("");
    }
  }, { enabled: isAdding });

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      const taskLabels = extractTaskTags(t).map((l) => l.toLowerCase());
      const matchesTag = selectedTag === "all" || taskLabels.includes(selectedTag.toLowerCase());
      return matchesSearch && matchesTag;
    });
  }, [tasks, searchQuery, selectedTag]);

  const taskIds = useMemo(() => filteredTasks.map((t) => t.id), [filteredTasks]);

  const handleCreateInlineTask = async () => {
    if (!taskTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await api.createTask(projectId, {
        title: taskTitle.trim(),
        column_id: column.id,
        priority: "medium",
      });
      toast.success(`Task "${created.title}" added to ${column.name}!`);
      setTaskTitle("");
      onRefreshProject();
    } catch (err) {
      toast.error("Failed to add task: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateInlineTask();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setTaskTitle("");
    }
  };

  const handleRenameStart = useCallback(() => {
    setRenameValue(column.name);
    setIsRenaming(true);
  }, [column.name]);

  const handleRenameSubmit = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === column.name) {
      setIsRenaming(false);
      return;
    }
    try {
      await api.updateColumn(column.id, { name: trimmed });
      onRefreshProject();
    } catch {
      toast.error("Failed to rename column");
    }
    setIsRenaming(false);
  }, [renameValue, column.name, column.id, onRefreshProject]);

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
    }
  };

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const showOver = isOver && !isColumnDragging;
  const columnColor = column.color || "#7F9CF5";

  const hexToRgba = (hex: string, alpha: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result || !result[1] || !result[2] || !result[3]) return hex;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: showOver ? "var(--brand-accent)" : "transparent",
      }}
      className={`relative w-full md:w-80 md:min-w-80 shrink-0 flex flex-col max-h-full rounded-md bg-surface-l2 shadow-xs group/col ${
        showOver ? "ring-2 ring-brand-accent/20 bg-surface-hover" : ""
      }`}
    >
      {/* Top border accent */}
      <div
        className={`absolute top-0 left-3 right-3 h-0.5 rounded-t-lg transition-opacity duration-200 ${
          isDragging || isOver ? "" : "opacity-40 md:opacity-25 group-hover/col:opacity-60"
        }`}
        style={{
          backgroundColor: columnColor,
          opacity: isDragging ? 0.9 : isOver ? 0.8 : undefined,
        }}
      />

      {/* Column Header */}
      <div className="h-11 md:h-10 flex items-center justify-between px-3.5 pt-2.5 pb-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="w-7 h-7 md:w-5 md:h-5 rounded flex items-center justify-center text-theme-tertiary opacity-100 md:opacity-0 md:group-hover/col:opacity-100 hover:text-theme-primary hover:bg-theme-elevated cursor-grab active:cursor-grabbing transition-all duration-200 touch-none shrink-0"
            tabIndex={0}
            aria-label="Drag to reorder column"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: columnColor }}
          />
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              maxLength={50}
              className="w-full max-w-[140px] bg-theme-elevated border border-brand-accent rounded px-2 py-0.5 text-base font-medium text-theme-primary outline-none"
            />
          ) : (
            <h3 className="text-base font-medium text-theme-primary truncate">{column.name}</h3>
          )}
          <span className="px-2 py-0.5 bg-theme-elevated text-theme-secondary font-mono text-[13px] rounded border border-theme-subtle shrink-0 leading-none">
            {filteredTasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/col:opacity-100 transition-all duration-200 shrink-0">
          <button
            onClick={() => setIsAdding(true)}
            className="w-8 h-8 md:w-6 md:h-6 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated active:bg-theme-hover flex items-center justify-center transition-colors shrink-0"
            title="Add task"
            aria-label="Add task to column"
          >
            <Plus className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
          <ColumnContextMenu
            columnId={column.id}
            columnName={column.name}
            columnColor={columnColor}
            projectId={projectId}
            onRefreshProject={onRefreshProject}
            onRenameTrigger={handleRenameStart}
            canMoveLeft={columnIndex > 0}
            canMoveRight={columnIndex < totalColumns - 1}
            onMoveLeft={() => onMoveColumn?.("left")}
            onMoveRight={() => onMoveColumn?.("right")}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 mt-2.5 mb-2.5 h-px bg-theme-subtle" />

      {/* Task Stack Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 px-3.5 pb-3.5 min-h-[100px]">
        {/* Add Task Button / Form at the VERY TOP of the Task List */}
        {isAdding ? (
          <div className="p-3 bg-theme-elevated border border-accent rounded-md space-y-2.5 shadow-md animate-in fade-in duration-100">
            <textarea
              autoFocus
              rows={2}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title, then Enter..."
              className="w-full bg-transparent text-sm text-theme-primary placeholder-theme-tertiary outline-none resize-none"
            />
            <div className="flex items-center justify-between pt-1 border-t border-theme-subtle">
              <span className="text-xs text-theme-secondary">Press Enter to add</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setTaskTitle(""); }}
                  className="px-2.5 py-1 text-xs text-theme-secondary hover:text-theme-primary rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateInlineTask}
                  disabled={!taskTitle.trim() || isSubmitting}
                  className="px-3 py-1 bg-brand-accent text-black text-xs font-semibold rounded-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full h-9 border border-dashed border-theme-default hover:border-brand-accent/50 rounded-md flex items-center justify-center text-theme-secondary hover:text-brand-accent bg-theme-surface/30 hover:bg-theme-elevated transition-all group"
            title="Add task"
            aria-label="Add task to column"
          >
            <Plus className="w-4 h-4 text-brand-accent stroke-[2.5] group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Task Cards Stack */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {filteredTasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export const KanbanColumn = memo(KanbanColumnInner);
