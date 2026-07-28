"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, TaskData, ChecklistItemData, ColumnData, useProject } from "@/lib/api";
import { AttachmentItem } from "../task-attachments-section";
import { extractTaskTags } from "@/lib/tags";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";

interface UseTaskDrawerOptions {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated?: (() => void) | undefined;
}


export function useTaskDrawer({ taskId, onClose, onTaskUpdated }: UseTaskDrawerOptions) {
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Editable states
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editDueDate, setEditDueDate] = useState<string | null>(null);

  // Tags & Attachments state
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<AttachmentItem[]>([]);

  // AbortController ref to cancel in-flight fetch on taskId change / unmount
  const abortRef = useRef<AbortController | null>(null);

  // Project details for column switching
  const { data: project } = useProject(task?.project_id ?? "");
  const columns: ColumnData[] = project?.columns || [];

  useHotkeys(
    "esc",
    () => {
      if (taskId) onClose();
    },
    { enabled: taskId !== null }
  );

  const fetchTaskDetails = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await api.getTask(id, signal ? { signal } : undefined);
      if (signal?.aborted) return;

      setTask(data);
      setEditTitle(data.title ?? "");
      setEditDescription(data.description ?? "");
      setEditPriority(data.priority ?? "medium");

      const rawDue = data.due_date;
      setEditDueDate(rawDue ? (rawDue.split("T")[0] ?? null) : null);
      setTaskTags(extractTaskTags(data));
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.error("Failed to load task details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId) {
      // Cancel previous in-flight fetch before starting a new one
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetchTaskDetails(taskId, controller.signal);
      setIsEditing(false);
    } else {
      abortRef.current?.abort();
      setTask(null);
    }

    return () => {
      abortRef.current?.abort();
    };
  }, [taskId, fetchTaskDetails]);

  const handleSaveEdit = async () => {
    if (!task) return;
    try {
      const updated = await api.updateTask(task.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        due_date: editDueDate ? new Date(editDueDate + "T00:00:00").toISOString() : null,
      });
      setTask(updated);
      setIsEditing(false);
      toast.success("Task details saved!");
      onTaskUpdated?.();
    } catch (e) {
      toast.error("Failed to update task: " + (e as Error).message);
    }
  };

  const handleColumnChange = async (newColumnId: string) => {
    if (!task || task.column_id === newColumnId) return;
    const targetCol = columns.find((c) => c.id === newColumnId);
    const newStatus = targetCol?.behavior === "completed" ? "done" : "todo";

    try {
      await api.moveTask(task.id, {
        column_id: newColumnId,
        position: 0,
        status: newStatus,
      });
      await fetchTaskDetails(task.id);
      toast.success(`Task moved to ${targetCol?.name || "new column"}`);
      onTaskUpdated?.();
    } catch (e) {
      toast.error("Failed to move column: " + (e as Error).message);
    }
  };

  const handleDueDateChange = async (iso: string | null) => {
    setEditDueDate(iso);
    if (!task) return;
    if (!isEditing) {
      try {
        const updated = await api.updateTask(task.id, {
          due_date: iso ? new Date(iso + "T00:00:00").toISOString() : null,
        });
        setTask(updated);
        toast.success("Due date updated");
        onTaskUpdated?.();
      } catch (e) {
        toast.error("Failed to update due date: " + (e as Error).message);
      }
    }
  };

  const handleTagsChange = async (newTags: string[]) => {
    setTaskTags(newTags);
    if (!task) return;
    try {
      const updated = await api.updateTask(task.id, { tags: newTags });
      setTask(updated);
      const refreshed = extractTaskTags(updated);
      setTaskTags(refreshed.length > 0 ? refreshed : newTags);
      onTaskUpdated?.();
    } catch (e) {
      toast.error("Failed to update tags: " + (e as Error).message);
    }
  };

  const handleAddChecklist = async (title: string) => {
    if (!task) return;
    try {
      await api.addChecklistItem(task.id, title);
      toast.success("Subtask added");
      fetchTaskDetails(task.id);
      onTaskUpdated?.();
    } catch (e) {
      toast.error("Failed to add subtask: " + (e as Error).message);
    }
  };

  const handleToggleChecklist = async (item: ChecklistItemData) => {
    if (!task) return;
    const nextStatus = !item.is_completed;

    // Use functional updater so we read the latest task snapshot,
    // not a stale closure value. This prevents race conditions
    // when multiple toggles are in flight.
    setTask((prev) => {
      if (!prev) return null;
      const currentItems = prev.checklist_items || [];
      const updatedItems = currentItems.map((c) =>
        c.id === item.id ? { ...c, is_completed: nextStatus } : c
      );
      return { ...prev, checklist_items: updatedItems };
    });

    try {
      await api.updateChecklistItem(item.id, { is_completed: nextStatus });
      toast.success(nextStatus ? "Subtask completed!" : "Marked incomplete");
      onTaskUpdated?.();
    } catch (e) {
      // Revert optimistically — only the specific item, using functional updater
      setTask((prev) => {
        if (!prev) return null;
        const currentItems = prev.checklist_items || [];
        const revertedItems = currentItems.map((c) =>
          c.id === item.id ? { ...c, is_completed: !nextStatus } : c
        );
        return { ...prev, checklist_items: revertedItems };
      });
      toast.error("Failed to update subtask: " + (e as Error).message);
    }
  };

  const handleDeleteChecklist = async (itemId: string) => {
    try {
      await api.deleteChecklistItem(itemId);
      toast.success("Subtask removed");
      if (task) fetchTaskDetails(task.id);
      onTaskUpdated?.();
    } catch (e) {
      toast.error("Failed to delete subtask: " + (e as Error).message);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    try {
      await api.deleteTask(task.id);
      toast.success("Task deleted");
      setIsDeleteModalOpen(false);
      onClose();
      onTaskUpdated?.();
    } catch (e) {
      toast.error("Failed to delete task: " + (e as Error).message);
    }
  };

  return {
    task,
    loading,
    isEditing,
    setIsEditing,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editPriority,
    setEditPriority,
    editDueDate,
    taskTags,
    taskAttachments,
    setTaskAttachments,
    columns,
    handleSaveEdit,
    handleColumnChange,
    handleDueDateChange,
    handleTagsChange,
    handleAddChecklist,
    handleToggleChecklist,
    handleDeleteChecklist,
    handleDeleteTask,
  };
}
