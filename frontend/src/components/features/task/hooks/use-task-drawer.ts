"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, TaskData, ChecklistItemData, ColumnData, AttachmentData, useProject } from "@/lib/api";
import {
  appendChecklistToBoard,
  invalidateProjectOverview,
  patchChecklistInBoard,
  patchTaskInBoard,
  removeChecklistFromBoard,
  removeTaskFromBoard,
} from "@/lib/api/queries/task-cache";
import { AttachmentItem } from "../task-attachments-section";
import { extractTaskTags } from "@/lib/tags";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";

interface UseTaskDrawerOptions {
  taskId: string | null;
  onClose: () => void;
}


export function useTaskDrawer({ taskId, onClose }: UseTaskDrawerOptions) {
  const queryClient = useQueryClient();
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Sync the board cache with a fresh server response so the board stays in
  // sync without refetching the whole project payload after every edit. The
  // overview payload is derived from the same rows, so it is invalidated too.
  const patchBoardCache = useCallback(
    (updatedTask: TaskData) => {
      const projectId = updatedTask.project_id || task?.project_id;
      if (!projectId) return;
      patchTaskInBoard(queryClient, projectId, updatedTask);
      invalidateProjectOverview(queryClient, projectId);
    },
    [queryClient, task?.project_id]
  );

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
      setTaskAttachments((data.attachments as AttachmentItem[]) ?? []);
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

  // Clipboard Paste Image Handler (Ctrl+V paste image directly to task attachments)
  useEffect(() => {
    if (!taskId || !task) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split("/")[1] || "png";
            const renamedFile = new File(
              [file],
              `pasted-image-${Date.now()}.${ext}`,
              { type: file.type }
            );
            imageFiles.push(renamedFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        toast.info(`Uploading ${imageFiles.length} pasted image(s)...`);
        for (const imgFile of imageFiles) {
          try {
            const updated = await api.uploadTaskAttachment(task.id, imgFile);
            setTask(updated);
            setTaskAttachments((updated.attachments as AttachmentItem[]) ?? []);
            patchBoardCache(updated);
            toast.success(`Pasted image attached to task!`);
          } catch (err) {
            toast.error("Failed to upload pasted image: " + (err as Error).message);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [taskId, task, patchBoardCache]);

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
      setTaskAttachments((updated.attachments as AttachmentItem[]) ?? taskAttachments);
      setIsEditing(false);
      patchBoardCache(updated);
      toast.success("Task details saved!");
    } catch (e) {
      toast.error("Failed to update task: " + (e as Error).message);
    }
  };

  const handleColumnChange = async (newColumnId: string) => {
    if (!task || task.column_id === newColumnId) return;
    const targetCol = columns.find((c) => c.id === newColumnId);
    const newStatus = targetCol?.behavior === "completed" ? "done" : "todo";

    try {
      const updated = await api.moveTask(task.id, {
        column_id: newColumnId,
        position: 0,
        status: newStatus,
      });
      await fetchTaskDetails(task.id);
      patchBoardCache(updated);
      toast.success(`Task moved to ${targetCol?.name || "new column"}`);
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
        setTaskAttachments((updated.attachments as AttachmentItem[]) ?? taskAttachments);
        patchBoardCache(updated);
        toast.success("Due date updated");
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
      setTaskAttachments((updated.attachments as AttachmentItem[]) ?? taskAttachments);
      const refreshed = extractTaskTags(updated);
      setTaskTags(refreshed.length > 0 ? refreshed : newTags);
      patchBoardCache(updated);
    } catch (e) {
      toast.error("Failed to update tags: " + (e as Error).message);
    }
  };

  const handleAddChecklist = async (title: string) => {
    if (!task) return;
    try {
      const item = await api.addChecklistItem(task.id, title);
      appendChecklistToBoard(queryClient, task.project_id, task.id, item);
      invalidateProjectOverview(queryClient, task.project_id);
      toast.success("Subtask added");
      fetchTaskDetails(task.id);
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
      const updated = await api.updateChecklistItem(item.id, { is_completed: nextStatus });
      patchChecklistInBoard(queryClient, task.project_id, updated);
      invalidateProjectOverview(queryClient, task.project_id);
      toast.success(nextStatus ? "Subtask completed!" : "Marked incomplete");
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
    if (!task) return;
    try {
      await api.deleteChecklistItem(itemId);
      removeChecklistFromBoard(queryClient, task.project_id, itemId);
      invalidateProjectOverview(queryClient, task.project_id);
      toast.success("Subtask removed");
      if (task) fetchTaskDetails(task.id);
    } catch (e) {
      toast.error("Failed to delete subtask: " + (e as Error).message);
    }
  };

  const handleAttachmentsChange = async (newAtts: AttachmentItem[]) => {
    setTaskAttachments(newAtts);
    if (!task) return;
    try {
      const toApiAttachment = (a: AttachmentItem): AttachmentData => {
        const item: AttachmentData = {
          id: a.id,
          type: a.type,
          title: a.title,
        };
        if (a.url !== undefined) item.url = a.url;
        if (a.preview_url !== undefined) item.preview_url = a.preview_url;
        if (a.size !== undefined) item.size = a.size;
        if (a.mimeType !== undefined) item.mime_type = a.mimeType;
        return item;
      };
      const updated = await api.updateTask(task.id, { attachments: newAtts.map(toApiAttachment) });
      setTask(updated);
      patchBoardCache(updated);
    } catch (e) {
      toast.error("Failed to save attachments: " + (e as Error).message);
    }
  };

  const handleUploadAttachment = async (file: File) => {
    if (!task) return;
    try {
      const updated = await api.uploadTaskAttachment(task.id, file);
      setTask(updated);
      setTaskAttachments((updated.attachments as AttachmentItem[]) ?? []);
      patchBoardCache(updated);
      toast.success(`File "${file.name}" uploaded to MinIO!`);
    } catch (e) {
      toast.error("Failed to upload attachment: " + (e as Error).message);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!task) return;
    try {
      const updated = await api.deleteTaskAttachment(task.id, attachmentId);
      setTask(updated);
      setTaskAttachments((updated.attachments as AttachmentItem[]) ?? []);
      patchBoardCache(updated);
      toast.success("Attachment removed");
    } catch (e) {
      toast.error("Failed to delete attachment: " + (e as Error).message);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    try {
      await api.deleteTask(task.id);
      removeTaskFromBoard(queryClient, task.project_id, task.id);
      invalidateProjectOverview(queryClient, task.project_id);
      toast.success("Task deleted");
      setIsDeleteModalOpen(false);
      onClose();
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
    handleAttachmentsChange,
    handleUploadAttachment,
    handleDeleteAttachment,
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
