"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Tag as TagIcon, FileCode, Layers } from "lucide-react";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { Button } from "@/components/ui/button";
import {
  TagCategory,
  CustomTag,
  getGlobalCategories,
  saveGlobalCategory,
  deleteGlobalCategory,
  getGlobalTags,
  saveGlobalTag,
  deleteGlobalTag,
  getTagStyle,
} from "@/lib/tags";
import { toast } from "sonner";

interface GlobalTagsManagerProps {
  onOpenJsonModal: () => void;
}

export function GlobalTagsManager({ onOpenJsonModal }: GlobalTagsManagerProps) {
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [tags, setTags] = useState<CustomTag[]>([]);

  // Category Form State
  const [newCatName, setNewCatName] = useState("");
  const [isAddingCat, setIsAddingCat] = useState(false);

  // Tag Form State
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#8A8F98"); // Default Neutral Gray
  const [newTagCatId, setNewTagCatId] = useState<string>("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  const refreshTagsData = () => {
    setCategories(getGlobalCategories());
    setTags(getGlobalTags());
  };

  useEffect(() => {
    refreshTagsData();
  }, []);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;

    const newCat: TagCategory = {
      id: `cat-${Date.now()}`,
      name,
    };

    saveGlobalCategory(newCat);
    setNewCatName("");
    setIsAddingCat(false);
    refreshTagsData();
    toast.success(`Category "${name}" created!`);
  };

  const handleDeleteCategory = (catId: string, name: string) => {
    deleteGlobalCategory(catId);
    refreshTagsData();
    toast.success(`Category "${name}" deleted.`);
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;

    const newTag: CustomTag = {
      id: `tag-${Date.now()}`,
      name,
      color: newTagColor || "#8A8F98",
      ...(newTagCatId ? { categoryId: newTagCatId } : {}),
    };

    saveGlobalTag(newTag);
    setNewTagName("");
    setNewTagColor("#8A8F98");
    setIsAddingTag(false);
    refreshTagsData();
    toast.success(`Global Tag "${name}" created!`);
  };

  const handleDeleteTag = (tagId: string, name: string) => {
    deleteGlobalTag(tagId);
    refreshTagsData();
    toast.success(`Global Tag "${name}" deleted.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
            Workspace Tag Library & Categories
          </div>
          <p className="text-xs text-theme-secondary mt-0.5">
            Manage reusable categories and tags across all workspace projects.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenJsonModal}
          className="px-3 py-1.5 rounded-[6px] bg-surface-l3 hover:bg-surface-l4 border border-theme-subtle text-brand-accent text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Import / Export JSON</span>
        </button>
      </div>

      {/* Category Management Block */}
      <div className="p-4 bg-surface-l2 border border-theme-subtle rounded-md space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand-accent" />
            <span>Categories ({categories.length})</span>
          </span>

          <button
            type="button"
            onClick={() => setIsAddingCat(!isAddingCat)}
            className="text-xs text-brand-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>

        {isAddingCat && (
          <form onSubmit={handleCreateCategory} className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name (e.g. Activity Type, Urgency)..."
              className="flex-1 bg-surface-l3 border border-theme-default rounded-[6px] px-3 py-1.5 text-xs text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent"
              autoFocus
            />
            <Button type="submit" variant="primary" size="sm" disabled={!newCatName.trim()}>
              Save Category
            </Button>
          </form>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="px-2.5 py-1 rounded-[6px] bg-surface-l3 border border-theme-subtle text-xs text-theme-primary font-medium flex items-center gap-2"
            >
              <span>{cat.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                className="text-theme-tertiary hover:text-semantic-danger transition-colors"
                title="Delete category"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {categories.length === 0 && !isAddingCat && (
            <p className="text-xs text-theme-tertiary italic">
              No categories created. Categories help group tags in the Task Drawer.
            </p>
          )}
        </div>
      </div>

      {/* Global Tag Templates Block */}
      <div className="p-4 bg-surface-l2 border border-theme-subtle rounded-md space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
            <TagIcon className="w-3.5 h-3.5 text-brand-accent" />
            <span>Workspace Tags ({tags.length})</span>
          </span>

          <button
            type="button"
            onClick={() => setIsAddingTag(!isAddingTag)}
            className="text-xs text-brand-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Workspace Tag</span>
          </button>
        </div>

        {isAddingTag && (
          <form onSubmit={handleCreateTag} className="p-3 bg-surface-l3 border border-theme-default rounded-[8px] space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name (e.g. Bug, Feature, Urgent)..."
                className="flex-1 bg-surface-l4 border border-theme-default rounded-[6px] px-3 py-1.5 text-xs text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent"
                autoFocus
              />

              <select
                value={newTagCatId}
                onChange={(e) => setNewTagCatId(e.target.value)}
                className="bg-surface-l4 border border-theme-default rounded-[6px] px-2.5 py-1.5 text-xs text-theme-secondary focus:outline-none focus:border-brand-accent cursor-pointer"
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <Button type="submit" variant="primary" size="sm" disabled={!newTagName.trim()}>
                Add Tag
              </Button>
            </div>

            <ColorSwatchPicker
              selectedColor={newTagColor}
              onSelect={(col) => setNewTagColor(col)}
              label="Select Tag Color (Default: Neutral Gray #8A8F98)"
            />
          </form>
        )}

        {/* List of Global Tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {tags.map((t) => {
            const style = getTagStyle(t.color);
            const cat = categories.find((c) => c.id === t.categoryId);
            return (
              <div
                key={t.id}
                className="px-2.5 py-1 rounded-[6px] text-xs font-medium border flex items-center gap-2 transition-all"
                style={{
                  backgroundColor: style.bgSubtle,
                  color: style.color,
                  borderColor: style.borderSubtle,
                }}
              >
                <span>
                  {t.name} {cat ? `(${cat.name})` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTag(t.id, t.name)}
                  className="hover:opacity-75 transition-opacity"
                  title="Delete global tag"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {tags.length === 0 && !isAddingTag && (
            <p className="text-xs text-theme-tertiary italic">
              No global tag templates configured. Default tags will be neutral gray `#8A8F98`.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
