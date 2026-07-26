"use client";

import { useState } from "react";
import { TagChip } from "@/components/ui/tag-chip";

interface ProjectTagsEditorProps {
  isEditingInline: boolean;
  tagsList: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  className?: string;
}

export function ProjectTagsEditor({
  isEditingInline,
  tagsList,
  onAddTag,
  onRemoveTag,
  className = "",
}: ProjectTagsEditorProps) {
  const [newTagInput, setNewTagInput] = useState("");

  const handleAdd = () => {
    const trimmed = newTagInput.trim();
    if (trimmed) {
      onAddTag(trimmed);
      setNewTagInput("");
    }
  };

  return (
    <div className={`space-y-2 pt-1 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {tagsList.map((tag, index) => (
          <TagChip
            key={`${tag}-${index}`}
            label={tag}
            onRemove={isEditingInline ? () => onRemoveTag(tag) : undefined}
          />
        ))}

        {isEditingInline && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="+ Add tag..."
              className="bg-surface-l3 border border-theme-subtle focus:border-brand-accent rounded-md px-2.5 py-0.5 text-[12px] font-mono text-theme-primary placeholder:text-theme-tertiary outline-none transition-colors w-24 sm:w-28"
            />
            {newTagInput.trim() && (
              <button
                type="button"
                onClick={handleAdd}
                className="px-2 py-0.5 bg-surface-l4 hover:bg-surface-elevated border border-theme-subtle rounded-md text-[11px] font-mono text-theme-primary transition-colors cursor-pointer"
              >
                Add
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
