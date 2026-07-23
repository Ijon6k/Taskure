"use client";

import { useState, useMemo, memo, useRef, useEffect, useCallback } from "react";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { Plus, GripVertical } from "lucide-react";
import { ColumnData, TaskData, api } from "@/lib/api";
import { KanbanCard } from "./kanban-card";
import { ColumnContextMenu } from "./column-context-menu";

interface KanbanColumnProps {
  column: ColumnData;
  tasks: TaskData[];
  projectId: string;
  onTaskClick: (task: TaskData) => void;
  onRefreshProject: () => void;
}

import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";
import { useUIStore } from "@/store/use-ui-store";

function KanbanColumnInner({ column, tasks, projectId, onTaskClick, onRefreshProject }: KanbanColumnProps) {
  const {
    setNodeRef: sortableRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column", column },
  });

  const { setNodeRef: droppableRef, isOver } = useDroppable({
    id: column.id,
    data: { column },
  });

  const { active } = useDndContext();
  const isColumnDragging = active?.data.current?.type === "column";

  const searchQuery = useUIStore((s) => s.searchQuery);
  const selectedTag = useUIStore((s) => s.selectedTag);

  const mergedRef = (node: HTMLDivElement | null) => {
    sortableRef(node);
    droppableRef(node);
  };

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
      const taskLabels = (t.labels || []).map((l) => (typeof l === "string" ? l : l.name).toLowerCase());
      const matchesTag = selectedTag === "all" || taskLabels.includes(selectedTag.toLowerCase());
      return matchesSearch && matchesTag;
    });
  }, [tasks, searchQuery, selectedTag]);

  const taskIds = filteredTasks.map((t) => t.id);

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

  return (
    <div
      ref={mergedRef}
      style={style}
      className={`relative w-[320px] min-w-[320px] shrink-0 flex flex-col max-h-full rounded-[10px] bg-theme-surface border border-theme-default shadow-sm group/col ${
        showOver ? "border-accent ring-2 ring-brand-accent/20 bg-theme-hover" : ""
      }`}
    >
      {/* Top border accent */}
      <div
        className={`absolute top-0 left-3 right-3 h-[3px] rounded-t-[8px] transition-opacity duration-200 ${
          isDragging || isOver ? "" : "opacity-[0.25] group-hover/col:opacity-50"
        }`}
        style={{
          backgroundColor: columnColor,
          opacity: isDragging ? 0.9 : isOver ? 0.8 : undefined,
        }}
      />

      {/* Column Header */}
      <div className="h-[44px] flex items-center justify-between px-3 pt-3 pb-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="w-5 h-5 rounded-[4px] flex items-center justify-center text-theme-tertiary/30 opacity-100 md:opacity-0 md:group-hover/col:opacity-100 hover:text-theme-primary hover:bg-theme-elevated cursor-grab active:cursor-grabbing transition-all duration-200 touch-none shrink-0"
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
              className="w-full max-w-[140px] bg-theme-elevated border border-brand-accent rounded-[4px] px-1.5 py-0.5 text-[15px] font-medium text-theme-primary outline-none"
            />
          ) : (
            <h3 className="text-[15px] font-medium text-theme-primary truncate">{column.name}</h3>
          )}
          <span className="px-2 py-0.5 bg-theme-elevated text-theme-secondary font-mono text-[11px] rounded-[4px] border border-theme-subtle shrink-0 leading-none">
            {filteredTasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover/col:opacity-100 transition-all duration-200 shrink-0">
          <button
            onClick={() => setIsAdding(true)}
            className="w-6 h-6 rounded-[6px] text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated flex items-center justify-center transition-colors shrink-0"
            title="Add task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <ColumnContextMenu
            columnId={column.id}
            columnName={column.name}
            columnColor={columnColor}
            projectId={projectId}
            onRefreshProject={onRefreshProject}
            onRenameTrigger={handleRenameStart}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 mt-3 mb-3 h-px bg-theme-subtle" />

      {/* Task Stack Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 px-3 pb-3 min-h-[100px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {filteredTasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {isAdding ? (
          <div className="p-3 bg-theme-elevated border border-accent rounded-[8px] space-y-2.5 shadow-md animate-in fade-in duration-100">
            <textarea
              autoFocus
              rows={2}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title, then Enter..."
              className="w-full bg-transparent text-[13px] text-theme-primary placeholder-theme-tertiary outline-none resize-none"
            />
            <div className="flex items-center justify-between pt-1 border-t border-theme-subtle">
              <span className="text-[10px] text-theme-secondary">Press Enter to add</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setTaskTitle(""); }}
                  className="px-2 py-0.5 text-[11px] text-theme-secondary hover:text-theme-primary rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateInlineTask}
                  disabled={!taskTitle.trim() || isSubmitting}
                  className="px-2.5 py-0.5 bg-brand-accent text-black text-[11px] font-medium rounded hover:opacity-90 transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full h-[36px] px-3 border border-dashed border-theme-default hover:border-theme-hover rounded-[8px] flex items-center gap-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-all text-[12px] font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-brand-accent" />
            <span>Add task</span>
          </button>
        )}
      </div>
    </div>
  );
}

export const KanbanColumn = memo(KanbanColumnInner);
