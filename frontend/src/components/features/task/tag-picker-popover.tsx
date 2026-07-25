"use client";

import { useState, useMemo } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Plus, Search, Check, Tag as TagIcon, Settings as SettingsIcon, Layers } from "lucide-react";
import Link from "next/link";
import {
  CustomTag,
  TagCategory,
  getTagStyle,
  getGlobalCategories,
  getGlobalTags,
  getProjectTags,
  saveGlobalTag,
} from "@/lib/tags";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";

interface TagPickerPopoverProps {
  labels: string[];
  onToggleLabel: (labelName: string) => void;
  onCreateProjectTag: (tagName: string, tagColor: string) => void;
  projectId?: string;
  trigger?: React.ReactNode;
}

export function TagPickerPopover({
  labels = [],
  onToggleLabel,
  onCreateProjectTag,
  projectId = "",
  trigger,
}: TagPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newColor, setNewColor] = useState("#8A8F98");
  const [saveToWorkspace, setSaveToWorkspace] = useState(false);

  // Load tags data
  const globalCategories = useMemo(() => getGlobalCategories(), [open]);
  const globalTags = useMemo(() => getGlobalTags(), [open]);
  const projectTags = useMemo(() => (projectId ? getProjectTags(projectId) : []), [open, projectId]);

  // Combine all available unique tags for search & selection
  const allAvailableTags = useMemo(() => {
    const map = new Map<string, CustomTag>();
    // Global Workspace Tags first
    globalTags.forEach((t) => map.set(t.name.toLowerCase(), t));
    // Project custom tags second (override if present)
    projectTags.forEach((t) => map.set(t.name.toLowerCase(), t));
    return Array.from(map.values());
  }, [globalTags, projectTags]);

  // Filtered tags based on search query
  const filteredTags = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allAvailableTags;
    return allAvailableTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [allAvailableTags, searchQuery]);

  const hasExactMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return false;
    return allAvailableTags.some((t) => t.name.toLowerCase() === q);
  }, [allAvailableTags, searchQuery]);

  const handleCreateNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const name = searchQuery.trim();
    if (!name) return;

    // Create locally for this project
    onCreateProjectTag(name, newColor);

    // Optionally save to Workspace Tag Library
    if (saveToWorkspace) {
      saveGlobalTag({
        id: `tag-${Date.now()}`,
        name,
        color: newColor,
      });
    }

    setSearchQuery("");
    setIsCreatingNew(false);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {trigger || (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-l3 hover:bg-surface-l4 border border-theme-subtle text-theme-secondary hover:text-theme-primary text-[12px] font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-brand-accent" />
            <span>Add tag</span>
          </button>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[280px] bg-surface-l5 border border-theme-default rounded-md shadow-elevation-l5 p-2.5 space-y-2.5 animate-in fade-in-0 zoom-in-95 duration-150 select-none text-left"
        >
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-theme-tertiary absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsCreatingNew(false);
              }}
              placeholder="Search or create tag..."
              className="w-full bg-surface-l3 border border-theme-subtle rounded-md pl-8 pr-2.5 py-1 text-[12px] text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:border-brand-accent"
              autoFocus
            />
          </div>

          {/* Categorized Workspace Tags List */}
          <div className="max-h-[220px] overflow-y-auto space-y-2 pr-0.5 text-[12px]">
            {/* Categorized Tags */}
            {globalCategories.map((cat) => {
              const catTags = filteredTags.filter((t) => t.categoryId === cat.id);
              if (catTags.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-1">
                  <div className="text-[10px] text-theme-tertiary font-medium uppercase tracking-wider px-1">
                    {cat.name}
                  </div>
                  <div className="space-y-0.5">
                    {catTags.map((tag) => {
                      const isSelected = labels.some((l) => l.toLowerCase() === tag.name.toLowerCase());
                      const style = getTagStyle(tag.color);

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => onToggleLabel(tag.name)}
                          className="w-full px-2 py-1 rounded-md hover:bg-surface-hover flex items-center justify-between transition-colors text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: style.color }}
                            />
                            <span className="text-theme-primary font-medium truncate">
                              {tag.name}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand-accent shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized / Project Tags */}
            {(() => {
              const uncategorized = filteredTags.filter((t) => !t.categoryId);
              if (uncategorized.length === 0) return null;

              return (
                <div className="space-y-1">
                  <div className="text-[10px] text-theme-tertiary font-medium uppercase tracking-wider px-1">
                    {globalCategories.length > 0 ? "General Tags" : "Workspace Tags"}
                  </div>
                  <div className="space-y-0.5">
                    {uncategorized.map((tag) => {
                      const isSelected = labels.some((l) => l.toLowerCase() === tag.name.toLowerCase());
                      const style = getTagStyle(tag.color);

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => onToggleLabel(tag.name)}
                          className="w-full px-2 py-1 rounded-md hover:bg-surface-hover flex items-center justify-between transition-colors text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: style.color }}
                            />
                            <span className="text-theme-primary font-medium truncate">
                              {tag.name}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand-accent shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* No Matches Found / Add New Action */}
            {filteredTags.length === 0 && !searchQuery.trim() && (
              <div className="py-4 text-center text-[12px] text-theme-tertiary">
                No tags in library yet. Type to create a new tag.
              </div>
            )}
          </div>

          {/* Inline Create New Custom Tag Trigger */}
          {searchQuery.trim() && !hasExactMatch && !isCreatingNew && (
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="w-full p-2 bg-surface-l3 hover:bg-surface-l4 border border-theme-subtle rounded-md text-[12px] text-brand-accent font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-left"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create "{searchQuery.trim()}" tag</span>
            </button>
          )}

          {/* Custom Tag Options Form */}
          {isCreatingNew && (
            <form onSubmit={handleCreateNewTag} className="p-2.5 bg-surface-l3 border border-theme-subtle rounded-md space-y-2.5 animate-in fade-in duration-100">
              <div className="text-[11px] font-medium text-theme-secondary">
                Color for "{searchQuery.trim()}"
              </div>
              <ColorSwatchPicker
                selectedColor={newColor}
                onSelect={(col) => setNewColor(col)}
              />

              <label className="flex items-center gap-2 pt-1 text-[11px] text-theme-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToWorkspace}
                  onChange={(e) => setSaveToWorkspace(e.target.checked)}
                  className="rounded border-theme-default bg-surface-l4 text-brand-accent focus:ring-0 cursor-pointer"
                />
                <span>Save to Workspace Tag Library</span>
              </label>

              <button
                type="submit"
                className="w-full py-1.5 bg-brand-accent hover:bg-brand-accent-hover text-black font-medium rounded-md text-[12px] transition-colors"
              >
                Add Tag
              </button>
            </form>
          )}

          {/* Footer Settings Link */}
          <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-[11px] text-theme-tertiary">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-theme-tertiary" />
              <span>Tag Library</span>
            </span>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="text-brand-accent hover:underline flex items-center gap-1 font-medium"
            >
              <SettingsIcon className="w-3 h-3" />
              <span>Settings</span>
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
