"use client";

import { useState, useMemo, memo, useRef, useEffect, useCallback } from "react";
import { useDndContext } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { Plus, GripVertical } from "lucide-react";
import { ColumnData, TaskData, api } from "@/lib/api";
import { SortableKanbanCard } from "./kanban-card";
import { ColumnContextMenu } from "./column-context-menu";
import { extractTaskTags } from "@/lib/tags";
import { SuggestedTagsBar } from "@/components/features/task/suggested-tags-bar";
import { TaskPriorityPicker } from "@/components/features/task/task-priority-picker";
import { StatusGlyphIcon } from "@/components/ui/display/status-badge";
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
  const [taskPriority, setTaskPriority] = useState("none");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useHotkeys("esc", () => {
    if (isAdding) {
      setIsAdding(false);
      setTaskTitle("");
      setTaskPriority("none");
      setSelectedTags([]);
    }
  }, { enabled: isAdding });

  const handleToggleTag = useCallback((tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t.toLowerCase() !== tagName.toLowerCase())
        : [...prev, tagName]
    );
  }, []);

  const handleTaskClick = useCallback((task: TaskData) => onTaskClick(task), [onTaskClick]);

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
        ...(taskPriority !== "none" ? { priority: taskPriority } : {}),
        ...(selectedTags.length > 0 ? { tags: selectedTags } : {}),
      });
      toast.success(`Task "${created.title}" added to ${column.name}!`);
      setTaskTitle("");
      setTaskPriority("none");
      setSelectedTags([]);
      setIsAdding(false);
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
      setTaskPriority("none");
      setSelectedTags([]);
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
      ref={setNodeRef}
      data-kanban-column="true"
      style={{ ...style }}
      className={`relative w-full h-full flex flex-col overflow-y-auto rounded-[6px] bg-surface-l2 group/col border ${
        showOver ? "border-brand-accent/50 ring-1 ring-brand-accent/20 bg-surface-hover" : "border-theme-subtle"
      }`}
    >
      {/* Sticky Column Header Container */}
      <div className="sticky top-0 z-30 bg-surface-l2 shrink-0 border-b border-theme-subtle rounded-t-[6px]">
        {/* Column Header */}
        <div className="h-9 flex items-center justify-between px-3 py-1.5 bg-surface-l2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              {...attributes}
              {...listeners}
              className="w-5 h-5 rounded flex items-center justify-center text-theme-tertiary opacity-100 md:opacity-0 md:group-hover/col:opacity-100 hover:text-theme-primary hover:bg-theme-elevated cursor-grab active:cursor-grabbing transition-all duration-150 touch-none shrink-0"
              tabIndex={0}
              aria-label="Drag to reorder column"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <StatusGlyphIcon
              status={column.behavior === "completed" ? "done" : column.name}
              color={columnColor}
              className="w-3.5 h-3.5 shrink-0"
            />
            {isRenaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                maxLength={50}
                className="w-full max-w-[130px] bg-theme-elevated border border-brand-accent rounded px-1.5 py-0.5 text-[13px] font-medium text-theme-primary outline-none"
              />
            ) : (
              <h3 className="text-[13px] font-semibold text-theme-primary truncate">{column.name}</h3>
            )}
            <span className="px-1.5 py-0.5 bg-surface-l3 text-theme-tertiary font-mono text-[10px] rounded-full border border-theme-subtle shrink-0 leading-none">
              {filteredTasks.length}
            </span>
          </div>

          <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover/col:opacity-100 transition-all duration-150 shrink-0">
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-theme-tertiary hover:text-theme-primary hover:bg-surface-l3 transition-colors cursor-pointer"
              title="Add task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <ColumnContextMenu
              columnId={column.id}
              columnName={column.name}
              columnColor={columnColor}
              columnBehavior={column.behavior || "active"}
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
      </div>

      {/* Task Stack Container */}
      <div className="space-y-2 p-2.5 min-h-[100px] rounded-b-[6px]">
        {/* Add Task Button / Form at the VERY TOP of the Task List */}
        {isAdding ? (
          <div className="p-3 bg-surface-l1 border border-theme-subtle rounded-[6px] space-y-2.5 shadow-elevation-l1 animate-in fade-in duration-100">
            <textarea
              autoFocus
              rows={2}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What needs to be done?"
              className="w-full bg-transparent text-sm text-theme-primary placeholder-theme-tertiary outline-none resize-none"
            />
            {/* Suggested Tags Chips */}
            <SuggestedTagsBar
              projectId={projectId}
              selectedTags={selectedTags}
              onToggleTag={handleToggleTag}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-theme-subtle">
              <TaskPriorityPicker
                priority={taskPriority}
                compact
                onChange={setTaskPriority}
              />
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setTaskTitle("");
                    setTaskPriority("none");
                    setSelectedTags([]);
                  }}
                  className="px-2 py-1 text-[11px] font-medium text-theme-secondary hover:text-theme-primary hover:bg-surface-l2 rounded-[4px] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateInlineTask}
                  disabled={!taskTitle.trim() || isSubmitting}
                  className="px-2.5 py-1 bg-brand-accent text-white text-[11px] font-medium rounded-[4px] hover:bg-brand-accent-hover border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all disabled:opacity-40 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full h-7 border border-dashed border-theme-subtle hover:border-theme-default rounded-[4px] flex items-center justify-center text-theme-tertiary hover:text-theme-secondary bg-surface-l3/30 hover:bg-surface-l3 transition-all group cursor-pointer"
            title="Add task"
            aria-label="Add task to column"
          >
            <Plus className="w-3.5 h-3.5 text-theme-tertiary group-hover:text-theme-secondary stroke-[2] transition-colors" />
          </button>
        )}

        {/* Task Cards Stack */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {filteredTasks.map((task) => (
            <SortableKanbanCard key={task.id} task={task} onTaskClick={handleTaskClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export const KanbanColumn = memo(KanbanColumnInner);
