"use client";

import { useState } from "react";
import { Tag, Plus, X, HelpCircle } from "lucide-react";

interface TaskLabelsSectionProps {
  labels?: string[];
  onChange?: (labels: string[]) => void;
}

const PRESET_LABELS = [
  { name: "Backend", color: "#7F9CF5" },
  { name: "Frontend", color: "#68D391" },
  { name: "API", color: "#B794F6" },
  { name: "Bug", color: "#F6685E" },
  { name: "Design", color: "#F6A5C0" },
  { name: "Database", color: "#F6AD8A" },
];

export function TaskLabelsSection({ labels = [], onChange }: TaskLabelsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const toggleLabel = (labelName: string) => {
    const exists = labels.includes(labelName);
    const updated = exists
      ? labels.filter((l) => l !== labelName)
      : [...labels, labelName];
    if (onChange) onChange(updated);
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTagInput.trim().toLowerCase();
    if (!tag) return;

    if (!labels.includes(tag)) {
      if (onChange) onChange([...labels, tag]);
    }
    setNewTagInput("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-2 pt-2">
      {/* Header & Helper toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
            Labels / Tags
          </div>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-theme-tertiary hover:text-theme-primary transition-colors"
            title="Apa fungsi Label?"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="text-[12px] font-medium text-brand-accent hover:underline flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Tag</span>
        </button>
      </div>

      {/* Explanation Tooltip / Banner */}
      {showHelp && (
        <div className="p-2.5 bg-theme-elevated border border-theme-subtle rounded-[6px] text-[12px] text-theme-secondary leading-relaxed">
          💡 <strong className="text-theme-primary">Fungsi Label:</strong> Label/Tag digunakan untuk mengelompokkan dan mengategorikan jenis tugas (misalnya: <code>backend</code>, <code>bug</code>, <code>api</code>, <code>v2</code>) agar mudah dipilah dan dikenali secara visual di papan Kanban.
        </div>
      )}

      {/* Current Active Labels */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {labels.map((label) => {
          const preset = PRESET_LABELS.find((p) => p.name.toLowerCase() === label.toLowerCase());
          const color = preset?.color || "#7F9CF5";
          return (
            <span
              key={label}
              className="px-2.5 py-1 rounded-[6px] text-[12px] font-medium border flex items-center gap-1.5 transition-colors group cursor-pointer"
              style={{
                backgroundColor: `${color}15`,
                color: color,
                borderColor: `${color}40`,
              }}
              onClick={() => toggleLabel(label)}
            >
              <Tag className="w-3 h-3" />
              <span>{label}</span>
              <X className="w-3 h-3 opacity-60 group-hover:opacity-100 hover:text-red-400" />
            </span>
          );
        })}

        {labels.length === 0 && !isAdding && (
          <span className="text-[13px] text-theme-tertiary italic">
            No labels attached.
          </span>
        )}
      </div>

      {/* Add Custom Tag Form */}
      {isAdding && (
        <form onSubmit={handleAddCustomTag} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            placeholder="Type new label name..."
            className="flex-1 bg-theme-elevated border border-theme-default rounded-[6px] px-3 py-1 text-[13px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newTagInput.trim()}
            className="px-2.5 py-1 bg-brand-accent text-black font-medium text-[12px] rounded-[6px] disabled:opacity-40"
          >
            Add
          </button>
        </form>
      )}

      {/* Quick Select Presets */}
      <div className="pt-1">
        <div className="text-[11px] text-theme-tertiary mb-1">Quick Select:</div>
        <div className="flex flex-wrap gap-1">
          {PRESET_LABELS.map((preset) => {
            const isSelected = labels.some((l) => l.toLowerCase() === preset.name.toLowerCase());
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => toggleLabel(preset.name.toLowerCase())}
                className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium border transition-all ${
                  isSelected
                    ? "opacity-100 ring-1 ring-white/20"
                    : "opacity-60 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: `${preset.color}15`,
                  color: preset.color,
                  borderColor: `${preset.color}30`,
                }}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
