"use client";

import { useState } from "react";
import { Plus, HelpCircle } from "lucide-react";
import { GENERIC_TAGS, getTagConfig } from "@/lib/tags";
import { TagChip } from "@/components/ui/tag-chip";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { Button } from "@/components/ui/button";

interface TaskLabelsSectionProps {
  labels?: string[];
  onChange?: (labels: string[]) => void;
}

export function TaskLabelsSection({ labels = [], onChange }: TaskLabelsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [showHelp, setShowHelp] = useState(false);

  const toggleLabel = (labelName: string) => {
    const exists = labels.some((l) => l.toLowerCase() === labelName.toLowerCase());
    const updated = exists
      ? labels.filter((l) => l.toLowerCase() !== labelName.toLowerCase())
      : [...labels, labelName];
    if (onChange) onChange(updated);
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTagInput.trim();
    if (!tag) return;

    if (!labels.some((l) => l.toLowerCase() === tag.toLowerCase())) {
      if (onChange) onChange([...labels, tag]);
    }
    setNewTagInput("");
    setIsAdding(false);
  };

  const activityTags = GENERIC_TAGS.filter((t) => t.category === "activity");
  const natureTags = GENERIC_TAGS.filter((t) => t.category === "nature");

  return (
    <div className="space-y-3 pt-1">
      {/* Header & Help Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-theme-tertiary hover:text-theme-primary transition-colors cursor-pointer"
            title="What are Tags?"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="text-[12px] font-medium text-brand-accent hover:underline flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Tag</span>
        </button>
      </div>

      {/* Explanation Banner */}
      {showHelp && (
        <div className="p-2.5 bg-theme-elevated border border-theme-subtle rounded-[6px] text-[12px] text-theme-secondary leading-relaxed">
          💡 <strong className="text-theme-primary">Tags & Categories:</strong> Categorize tasks by <em>Activity Type</em> (e.g. <code>Meeting</code>, <code>Planning</code>, <code>Research</code>) or by <em>Nature & Urgency</em> (e.g. <code>Urgent</code>, <code>Important</code>, <code>Routine</code>, <code>Idea</code>). You can also add custom colored tags!
        </div>
      )}

      {/* Current Active Tag Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {labels.map((label) => {
          const tagCfg = getTagConfig(label);
          return (
            <TagChip
              key={label}
              label={tagCfg.label}
              color={tagCfg.color}
              onRemove={() => toggleLabel(label)}
            />
          );
        })}

        {labels.length === 0 && !isAdding && (
          <span className="text-[12px] text-theme-tertiary italic">
            No tags attached yet. Select a preset tag below.
          </span>
        )}
      </div>

      {/* Add Custom Tag Form with Color Swatches */}
      {isAdding && (
        <form onSubmit={handleAddCustomTag} className="p-3 bg-theme-elevated border border-theme-default rounded-[8px] space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="Custom tag name (e.g. Client Call, Audit)..."
              className="flex-1 bg-theme-surface border border-theme-default rounded-[6px] px-3 py-1 text-[13px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent"
              autoFocus
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!newTagInput.trim()}
            >
              Add
            </Button>
          </div>

          <ColorSwatchPicker
            selectedColor={selectedColor}
            onSelect={(color) => setSelectedColor(color)}
            label="Select Custom Accent"
          />
        </form>
      )}

      {/* Preset 1: Activity Types */}
      <div className="pt-1 space-y-1">
        <div className="text-[11px] text-theme-tertiary font-mono uppercase tracking-[0.5px]">
          Activity Type:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {activityTags.map((tag) => {
            const isSelected = labels.some((l) => l.toLowerCase() === tag.label.toLowerCase());
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleLabel(tag.label)}
                className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? "opacity-100 ring-1 ring-white/30 font-semibold"
                    : "opacity-60 hover:opacity-100 hover:bg-theme-elevated"
                }`}
                style={{
                  backgroundColor: tag.bgSubtle,
                  color: tag.color,
                  borderColor: tag.borderSubtle,
                }}
              >
                {tag.label} {isSelected && "✓"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset 2: Nature & Priority */}
      <div className="pt-1 space-y-1">
        <div className="text-[11px] text-theme-tertiary font-mono uppercase tracking-[0.5px]">
          Nature & Urgency:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {natureTags.map((tag) => {
            const isSelected = labels.some((l) => l.toLowerCase() === tag.label.toLowerCase());
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleLabel(tag.label)}
                className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? "opacity-100 ring-1 ring-white/30 font-semibold"
                    : "opacity-60 hover:opacity-100 hover:bg-theme-elevated"
                }`}
                style={{
                  backgroundColor: tag.bgSubtle,
                  color: tag.color,
                  borderColor: tag.borderSubtle,
                }}
              >
                {tag.label} {isSelected && "✓"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
