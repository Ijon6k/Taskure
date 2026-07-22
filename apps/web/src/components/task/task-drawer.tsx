"use client";

import { useState, useEffect } from "react";
import { X, Calendar, AlertCircle, CheckSquare, Plus, Trash2 } from "lucide-react";
import { api, TaskData, ChecklistItemData } from "@/lib/api";

interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export function TaskDrawer({ taskId, onClose, onTaskUpdated }: TaskDrawerProps) {
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");

  const fetchTaskDetails = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getTask(id);
      setTask(data);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails(taskId);
    } else {
      setTask(null);
    }
  }, [taskId]);

  if (!taskId) return null;

  const handleUpdateTask = async (updates: Partial<TaskData>) => {
    if (!task) return;
    try {
      const updated = await api.updateTask(task.id, updates);
      setTask(updated);
      if (onTaskUpdated) onTaskUpdated();
    } catch (e) {
      alert("Gagal mengupdate tugas: " + (e as Error).message);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newChecklistTitle.trim()) return;

    try {
      await api.addChecklistItem(task.id, newChecklistTitle.trim());
      setNewChecklistTitle("");
      fetchTaskDetails(task.id);
      if (onTaskUpdated) onTaskUpdated();
    } catch (e) {
      alert("Gagal menambahkan checklist: " + (e as Error).message);
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
    if (!task || !confirm("Apakah Anda yakin ingin menghapus tugas ini?")) return;
    try {
      await api.deleteTask(task.id);
      onClose();
      if (onTaskUpdated) onTaskUpdated();
    } catch (e) {
      alert("Gagal menghapus tugas: " + (e as Error).message);
    }
  };

  const checklistItems = task?.checklist_items || [];
  const completedCount = checklistItems.filter((i) => i.is_completed).length;
  const progressPercent = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-theme-surface border-l border-theme-border text-theme-text shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-theme-border flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-text-tertiary uppercase tracking-wider">
              Detail Task
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteTask}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                title="Hapus Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1 text-theme-text-tertiary hover:text-theme-text rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {loading || !task ? (
            <div className="p-6 space-y-4 animate-pulse">
              <div className="w-3/4 h-6 bg-theme-elevated rounded" />
              <div className="w-full h-24 bg-theme-elevated rounded" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title Input */}
              <div>
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => setTask({ ...task, title: e.target.value })}
                  onBlur={() => handleUpdateTask({ title: task.title })}
                  className="w-full text-lg font-bold bg-transparent text-theme-text border-b border-transparent hover:border-theme-border focus:border-brand-lavender focus:outline-none pb-1 transition-colors"
                />
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-theme-text-tertiary uppercase tracking-wider mb-1">
                    Prioritas
                  </label>
                  <select
                    value={task.priority}
                    onChange={(e) => handleUpdateTask({ priority: e.target.value as any })}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg px-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand-lavender"
                  >
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟡 Tinggi (High)</option>
                    <option value="medium">🔵 Sedang (Medium)</option>
                    <option value="low">⚪ Rendah (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-theme-text-tertiary uppercase tracking-wider mb-1">
                    Jatuh Tempo
                  </label>
                  <input
                    type="date"
                    value={task.due_date ? task.due_date.split("T")[0] : ""}
                    onChange={(e) =>
                      handleUpdateTask({ due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })
                    }
                    className="w-full bg-theme-bg border border-theme-border rounded-lg px-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand-lavender"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-medium text-theme-text-tertiary uppercase tracking-wider mb-1">
                  Deskripsi & Catatan
                </label>
                <textarea
                  rows={4}
                  value={task.description || ""}
                  onChange={(e) => setTask({ ...task, description: e.target.value })}
                  onBlur={() => handleUpdateTask({ description: task.description })}
                  placeholder="Tambahkan detail tugas atau catatan Markdown..."
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-xs text-theme-text focus:outline-none focus:border-brand-lavender transition-colors resize-none"
                />
              </div>

              {/* Checklist Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-theme-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    Checklist ({completedCount}/{checklistItems.length})
                  </span>
                  <span className="text-xs text-theme-text-tertiary font-mono">{progressPercent}%</span>
                </div>

                {/* Progress bar */}
                {checklistItems.length > 0 && (
                  <div className="w-full bg-theme-bg h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-lavender h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}

                {/* Checklist Items List */}
                <div className="space-y-1.5">
                  {checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-theme-bg rounded-lg group text-xs"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.is_completed}
                          onChange={() => handleToggleChecklist(item)}
                          className="rounded border-theme-border text-brand-lavender focus:ring-0 shrink-0"
                        />
                        <span
                          className={`truncate ${
                            item.is_completed ? "line-through text-theme-text-tertiary" : "text-theme-text"
                          }`}
                        >
                          {item.title}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteChecklist(item.id)}
                        className="text-theme-text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Checklist Form */}
                <form onSubmit={handleAddChecklist} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    placeholder="Tambah item checklist..."
                    className="flex-1 bg-theme-bg border border-theme-border rounded-lg px-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand-lavender"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-theme-elevated hover:bg-theme-hover text-theme-text rounded-lg border border-theme-border transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
