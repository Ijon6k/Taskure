"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Trash2, Edit3, Check } from "lucide-react";
import { api, TaskData, ChecklistItemData } from "@/lib/api";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { TaskPriorityPicker } from "./task-priority-picker";
import { TaskSubtasksSection } from "./task-subtasks-section";
import { TaskLabelsSection } from "./task-labels-section";
import { TaskAttachmentsSection, AttachmentItem } from "./task-attachments-section";

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
  const [editDueDate, setEditDueDate] = useState("");
  const [taskLabels, setTaskLabels] = useState<string[]>(["backend", "api"]);
  const [taskAttachments, setTaskAttachments] = useState<AttachmentItem[]>([]);

  const fetchTaskDetails = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getTask(id);
      setTask(data);
      setEditTitle(data.title || "");
      setEditDescription(data.description || "");
      setEditPriority(data.priority || "medium");
      setEditDueDate(data.due_date ? (data.due_date.split("T")[0] ?? "") : "");
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails(taskId);
      setIsEditing(false);
    } else {
      setTask(null);
    }
  }, [taskId]);

  if (!taskId) return null;

  const handleSaveEdit = async () => {
    if (!task) return;
    try {
      const updated = await api.updateTask(task.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority as any,
        due_date: editDueDate ? new Date(editDueDate).toISOString() : undefined,
      });
      setTask(updated);
      setIsEditing(false);
      if (onTaskUpdated) onTaskUpdated();
    } catch (e) {
      alert("Gagal mengupdate tugas: " + (e as Error).message);
    }
  };

  const handleAddChecklist = async (title: string) => {
    if (!task) return;
    try {
      await api.addChecklistItem(task.id, title);
      fetchTaskDetails(task.id);
      if (onTaskUpdated) onTaskUpdated();
    } catch (e) {
      alert("Gagal menambahkan subtask: " + (e as Error).message);
    }
  };

  const handleToggleChecklist = async (item: ChecklistItemData) => {
    try {
      await api.updateChecklistItem(item.id, { is_completed: !item.is_completed });
      if (task) fetchTaskDetails(task.id);
      if (onTaskUpdated) onTaskUpdated();
    } catch (e) {
      alert("Gagal mengupdate item: " + (e as Error).message);
    }
  };

  const handleDeleteChecklist = async (itemId: string) => {
    try {
      await api.deleteChecklistItem(itemId);
      if (task) fetchTaskDetails(task.id);
      if (onTaskUpdated) onTaskUpdated();
    } catch (e) {
      alert("Gagal menghapus item: " + (e as Error).message);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    try {
      await api.deleteTask(task.id);
      setIsDeleteModalOpen(false);
      onClose();
      if (onTaskUpdated) onTaskUpdated();
    } catch (e) {
      alert("Gagal menghapus tugas: " + (e as Error).message);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden select-none">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-theme-surface border-l border-theme-default text-theme-primary shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-theme-default flex items-center justify-between bg-theme-elevated">
              <span className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                Task
              </span>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 bg-brand-accent text-black text-[12px] font-medium rounded-[6px] hover:opacity-90 transition-opacity flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-2.5 py-1 bg-theme-surface hover:bg-theme-hover text-theme-primary text-[12px] font-medium rounded-[6px] border border-theme-default transition-colors flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-brand-accent" />
                    <span>Edit Task</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-[6px] transition-colors"
                  title="Hapus Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-hover rounded-[6px] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body Content */}
            {loading || !task ? (
              <div className="p-6 space-y-4 animate-pulse">
                <div className="w-3/4 h-6 bg-theme-elevated rounded-[6px]" />
                <div className="w-full h-24 bg-theme-elevated rounded-[6px]" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Title */}
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-[18px] font-medium bg-theme-elevated text-theme-primary border border-theme-default rounded-[6px] p-2 focus:border-brand-accent focus:outline-none transition-colors"
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

                {/* Due Date Row */}
                <div className="pt-2">
                  <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px] mb-1.5">
                    Due date
                  </div>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full bg-theme-elevated border border-theme-default rounded-[6px] px-2.5 py-1.5 text-[14px] text-theme-primary focus:outline-none focus:border-brand-accent"
                    />
                  ) : (
                    <div className="px-2.5 py-1.5 bg-theme-elevated border border-theme-default rounded-[6px] text-[14px] text-theme-primary flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-theme-secondary" />
                      <span>{task.due_date ? (task.due_date.split("T")[0] ?? "No date") : "No date"}</span>
                    </div>
                  )}
                </div>

                {/* Labels Section */}
                <TaskLabelsSection
                  labels={taskLabels}
                  onChange={(newLabels) => setTaskLabels(newLabels)}
                />

                {/* Description Box */}
                <div className="space-y-1.5 pt-2">
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
                      {task.description || "What needs to happen?"}
                    </div>
                  )}
                </div>

                {/* Subtasks Section */}
                <TaskSubtasksSection
                  checklistItems={task.checklist_items || []}
                  onToggleItem={handleToggleChecklist}
                  onDeleteItem={handleDeleteChecklist}
                  onAddItem={handleAddChecklist}
                />

                {/* Attachments Section (Dual Link + Dropzone Upload) */}
                <TaskAttachmentsSection
                  attachments={taskAttachments}
                  onChange={(newAtts) => setTaskAttachments(newAtts)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Hapus Task"
        description={`Apakah Anda yakin ingin menghapus "${task?.title}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Task"
        isDanger={true}
        onConfirm={handleDeleteTask}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
