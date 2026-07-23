"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Trash2, Edit3, Check } from "lucide-react";
import { api, TaskData, ChecklistItemData } from "@/lib/api";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { TaskPriorityPicker } from "./task-priority-picker";
import { TaskSubtasksSection } from "./task-subtasks-section";
import { TaskLabelsSection } from "./task-labels-section";
import { TaskAttachmentsSection, AttachmentItem } from "./task-attachments-section";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";

interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export function TaskDrawer({ taskId, onClose, onTaskUpdated }: TaskDrawerProps) {
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Editable states
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editDueDate, setEditDueDate] = useState<string | null>(null);

  // Tags state — synced from task.tags on fetch, saved to API on change
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<AttachmentItem[]>([]);

  useHotkeys("esc", () => {
    if (taskId) onClose();
  }, { enabled: taskId !== null });

  const fetchTaskDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getTask(id);
      setTask(data);
      setEditTitle(data.title ?? "");
      setEditDescription(data.description ?? "");
      setEditPriority(data.priority ?? "medium");

      // Parse due_date — strip time component for the picker
      const rawDue = data.due_date;
      setEditDueDate(rawDue ? (rawDue.split("T")[0] ?? null) : null);

      // BUG FIX: Initialize tags from fetched task data
      setTaskTags(data.tags ?? []);
    } catch {
      toast.error("Failed to load task details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails(taskId);
      setIsEditing(false);
    } else {
      setTask(null);
    }
  }, [taskId, fetchTaskDetails]);

  if (!taskId) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  const handleDueDateChange = async (iso: string | null) => {
    setEditDueDate(iso);
    if (!task) return;
    // Instantly save when not in edit mode (direct date picker click)
    if (!isEditing) {
      try {
        await api.updateTask(task.id, {
          due_date: iso ? new Date(iso + "T00:00:00").toISOString() : null,
        });
        toast.success(iso ? "Due date updated" : "Due date cleared");
        onTaskUpdated?.();
      } catch {
        toast.error("Failed to update due date");
      }
    }
  };

  // BUG FIX: Tags now sync to API immediately on change
  const handleTagsChange = async (newTags: string[]) => {
    setTaskTags(newTags);
    if (!task) return;
    try {
      await api.updateTask(task.id, { tags: newTags });
      onTaskUpdated?.();
    } catch {
      toast.error("Failed to save tags");
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
    try {
      await api.updateChecklistItem(item.id, { is_completed: !item.is_completed });
      toast.success(item.is_completed ? "Marked incomplete" : "Subtask completed!");
      if (task) fetchTaskDetails(task.id);
      onTaskUpdated?.();
    } catch (e) {
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden select-none">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          {/* Drawer panel */}
          <div className="w-screen max-w-[540px] bg-theme-surface border-l border-theme-default text-theme-primary shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">

            {/* ── Header ── */}
            <div className="px-6 py-4 border-b border-theme-default flex items-center justify-between bg-theme-elevated">
              <span className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                Task Details
              </span>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span>Save</span>
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 className="w-3.5 h-3.5 text-brand-accent mr-1" />
                    <span>Edit Task</span>
                  </Button>
                )}
                <IconButton
                  icon={Trash2}
                  variant="danger"
                  size="sm"
                  title="Delete Task"
                  onClick={() => setIsDeleteModalOpen(true)}
                />
                <IconButton
                  icon={X}
                  variant="ghost"
                  size="sm"
                  title="Close Drawer (Esc)"
                  onClick={onClose}
                />
              </div>
            </div>

            {/* ── Body ── */}
            {loading || !task ? (
              <div className="p-6 space-y-4 animate-pulse">
                <div className="w-3/4 h-6 bg-theme-elevated rounded-[6px]" />
                <div className="w-full h-24 bg-theme-elevated rounded-[6px]" />
                <div className="w-1/2 h-4 bg-theme-elevated rounded-[6px]" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Title */}
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-[18px] font-medium bg-theme-elevated text-theme-primary border border-theme-default rounded-[6px] p-2.5 focus:border-brand-accent focus:outline-none transition-colors"
                    />
                  ) : (
                    <h1 className="text-[18px] font-medium text-theme-primary leading-snug">
                      {task.title}
                    </h1>
                  )}
                </div>

                {/* Priority Selector */}
                <TaskPriorityPicker
                  priority={isEditing ? editPriority : task.priority}
                  isEditing={isEditing}
                  onChange={(p) => setEditPriority(p)}
                />

                {/* Due Date Row — DatePickerPopover */}
                <div className="pt-1 space-y-1.5">
                  <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                    Due Date
                  </div>
                  <DatePickerPopover
                    value={editDueDate}
                    onChange={handleDueDateChange}
                    placeholder="Set a due date..."
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                    Description
                  </div>
                  {isEditing ? (
                    <textarea
                      rows={4}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="What needs to happen?"
                      className="w-full bg-theme-elevated border border-theme-default rounded-[6px] p-3 text-[14px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent transition-colors resize-none"
                    />
                  ) : (
                    <div className="p-3 bg-theme-elevated border border-theme-default rounded-[6px] text-[14px] text-theme-secondary min-h-[80px] whitespace-pre-wrap leading-relaxed">
                      {task.description || "No description provided."}
                    </div>
                  )}
                </div>

                {/* Tags & Categories — BUG FIX: synced to API */}
                <CollapsibleSection title="Tags & Categories" defaultOpen={true}>
                  <TaskLabelsSection
                    labels={taskTags}
                    onChange={handleTagsChange}
                  />
                </CollapsibleSection>

                {/* Subtasks & Checklist */}
                <CollapsibleSection title="Subtasks & Checklist" defaultOpen={true}>
                  <TaskSubtasksSection
                    checklistItems={task.checklist_items ?? []}
                    onToggleItem={handleToggleChecklist}
                    onDeleteItem={handleDeleteChecklist}
                    onAddItem={handleAddChecklist}
                  />
                </CollapsibleSection>

                {/* Attachments & Links */}
                <CollapsibleSection title="Attachments & Links" defaultOpen={true}>
                  <TaskAttachmentsSection
                    attachments={taskAttachments}
                    onChange={(newAtts) => setTaskAttachments(newAtts)}
                  />
                </CollapsibleSection>

              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Task"
        description={`Are you sure you want to delete "${task?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Task"
        isDanger={true}
        onConfirm={handleDeleteTask}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
