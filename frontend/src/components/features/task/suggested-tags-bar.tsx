"use client";

import { useMemo } from "react";
import { Tag as TagIcon, Plus, Check } from "@phosphor-icons/react";
import { useSuggestedTags } from "@/lib/api/queries/use-projects";
import { getProjectTags, getTagConfig } from "@/lib/tags";

const MAX_SUGGESTED_TAGS = 8;
const DEFAULT_STARTER_TAGS = ["Feature", "Bug", "Design", "Refactor"];

interface SuggestedTagsBarProps {
  projectId: string;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

/** Inline tag suggestions bar shown when a task has no tags yet. */
export function SuggestedTagsBar({
  projectId,
  selectedTags,
  onToggleTag,
}: SuggestedTagsBarProps) {
  const { data: backendSuggestedTags } = useSuggestedTags(projectId);

  const tagsToDisplay = useMemo(() => {
    const seen = new Set<string>();
    const tags: string[] = [];
    const pushTag = (tag: string) => {
      const key = tag.toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      tags.push(tag);
    };

    backendSuggestedTags?.forEach(pushTag);
    getProjectTags(projectId).forEach((t) => pushTag(t.name));
    DEFAULT_STARTER_TAGS.forEach(pushTag);
    selectedTags.forEach(pushTag);

    return tags.slice(0, MAX_SUGGESTED_TAGS);
  }, [backendSuggestedTags, projectId, selectedTags]);

  if (tagsToDisplay.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap pt-1.5 pb-0.5">
      <span className="text-[11px] font-medium text-theme-tertiary flex items-center gap-1 shrink-0 mr-0.5">
        <TagIcon className="w-3 h-3 text-theme-tertiary" />
        Suggested:
      </span>
      {tagsToDisplay.map((tagName) => {
        const isSelected = selectedTags.some(
          (t) => t.toLowerCase() === tagName.toLowerCase()
        );
        const tagConfig = getTagConfig(tagName, projectId);

        return (
          <button
            key={tagName}
            type="button"
            onClick={() => onToggleTag(tagName)}
            className={`h-5.5 px-2 rounded-full text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer select-none ${
              isSelected
                ? "ring-1 ring-brand-accent/50 shadow-xs font-semibold"
                : "hover:scale-[1.02] active:scale-[0.98] opacity-80 hover:opacity-100"
            }`}
            style={{
              backgroundColor: tagConfig.bgSubtle,
              color: tagConfig.color,
              borderColor: isSelected ? tagConfig.color : tagConfig.borderSubtle,
            }}
          >
            {isSelected ? (
              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
            ) : (
              <Plus className="w-2.5 h-2.5 stroke-[2.5] opacity-70" />
            )}
            <span>{tagConfig.label}</span>
          </button>
        );
      })}
    </div>
  );
}
