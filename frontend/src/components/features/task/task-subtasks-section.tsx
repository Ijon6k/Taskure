"use client";

import { useState } from "react";
import { CheckSquare, Plus, X } from "lucide-react";
import { ChecklistItemData } from "@/lib/api";

interface TaskSubtasksSectionProps {
  checklistItems: ChecklistItemData[];
  onToggleItem: (item: ChecklistItemData) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (title: string) => void;
}

export function TaskSubtasksSection({
  checklistItems,
  onToggleItem,
  onDeleteItem,
  onAddItem,
}: TaskSubtasksSectionProps) {
  const [newTitle, setNewTitle] = useState("");

  const completedCount = checklistItems.filter((i) => i.is_completed).length;
  const progressPercent = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddItem(newTitle.trim());
    setNewTitle("");
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
          Subtasks
        </div>
        <div className="text-[12px] font-mono text-theme-secondary">
          {completedCount}/{checklistItems.length}
        </div>
      </div>

      {/* Progress Bar (Matching drawer.html #68D391 green bar) */}
      {checklistItems.length > 0 && (
        <div className="w-full bg-surface-l3 h-1 rounded-full overflow-hidden">
          <div
            className="bg-semantic-success h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Items List */}
      <div className="space-y-1">
        {checklistItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-1.5 px-2 hover:bg-theme-hover rounded-[6px] group transition-colors text-[14px]"
          >
            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
              <input
                type="checkbox"
                checked={item.is_completed}
                onChange={() => onToggleItem(item)}
                className="w-4 h-4 rounded border-white/20 text-semantic-success focus:ring-0 accent-semantic-success cursor-pointer"
              />
              <span
                className={`truncate ${
                  item.is_completed
                    ? "line-through text-theme-tertiary"
                    : "text-theme-primary"
                }`}
              >
                {item.title}
              </span>
            </label>
            <button
              type="button"
              onClick={() => onDeleteItem(item.id)}
              className="text-theme-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Subtask Inline Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a subtask…"
          className="flex-1 bg-theme-elevated border border-white/6 rounded-[6px] px-3 py-1.5 text-[14px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent transition-colors"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="p-1.5 bg-theme-elevated hover:bg-theme-hover text-theme-primary rounded-[6px] border border-white/8 transition-colors shrink-0 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* Footer Hint (Matching drawer.html) */}
      <p className="text-[11px] text-theme-secondary leading-relaxed">
        Completing subtasks won’t move the task — you stay in control of its status.
      </p>
    </div>
  );
}
