"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Tag as TagIcon, FileCode, Layers, Check } from "lucide-react";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
  const [newTagColor, setNewTagColor] = useState("#8A8F98");
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
    toast.success(`Tag "${name}" created!`);
  };

  const handleDeleteTag = (tagId: string, name: string) => {
    deleteGlobalTag(tagId);
    refreshTagsData();
    toast.success(`Tag "${name}" deleted.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar — Borderless */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-theme-primary">
            Tags & Categories Library
          </h3>
          <p className="text-[14px] text-theme-secondary mt-0.5">
            Manage reusable categories and tags across all workspace projects.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenJsonModal}
          className="px-3.5 py-2 rounded-md bg-surface-l2 hover:bg-surface-l3 text-brand-accent text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <FileCode className="w-4 h-4" />
          <span>Import / Export Tag Specs</span>
        </button>
      </div>

      {/* Category Management Block */}
      <div className="p-4 bg-surface-l2 rounded-md space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-theme-primary uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-accent" />
            <span>Categories ({categories.length})</span>
          </span>

          <button
            type="button"
            onClick={() => setIsAddingCat(!isAddingCat)}
            className="text-[13px] text-brand-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <Plus className="w-4 h-4" />
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
              className="flex-1 bg-surface-l4 focus:ring-2 focus:ring-brand-accent/20 rounded-md px-3.5 py-2 text-[14px] text-theme-primary placeholder-theme-tertiary outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-black text-[13px] font-semibold rounded-md transition-all disabled:opacity-40 cursor-pointer"
            >
              Save Category
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="px-3 py-1.5 rounded-md bg-surface-l3 text-[13px] text-theme-primary font-medium flex items-center gap-2.5 transition-colors"
            >
              <span>{cat.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                className="text-theme-tertiary hover:text-red-400 transition-colors cursor-pointer"
                title="Delete category"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {categories.length === 0 && !isAddingCat && (
            <p className="text-[13px] text-theme-tertiary italic">
              No categories created yet. Categories group tags in the Task Drawer.
            </p>
          )}
        </div>
      </div>

      {/* Global Tag Templates Block */}
      <div className="p-4 bg-surface-l2 rounded-md space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-theme-primary uppercase tracking-wider flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-brand-accent" />
            <span>Workspace Tags ({tags.length})</span>
          </span>

          <button
            type="button"
            onClick={() => setIsAddingTag(!isAddingTag)}
            className="text-[13px] text-brand-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Workspace Tag</span>
          </button>
        </div>

        {isAddingTag && (
          <form onSubmit={handleCreateTag} className="p-4 bg-surface-l3 rounded-md space-y-3.5 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name (e.g. Bug, Feature, Urgent)..."
                className="flex-1 bg-surface-l4 focus:ring-2 focus:ring-brand-accent/20 rounded-md px-3.5 py-2 text-[14px] text-theme-primary placeholder-theme-tertiary outline-none"
                autoFocus
              />

              <Select value={newTagCatId || "none"} onValueChange={(val) => setNewTagCatId(val === "none" ? "" : val)}>
                <SelectTrigger className="w-[150px] h-9 text-[13px] bg-surface-l4 border border-theme-subtle">
                  <SelectValue placeholder="No Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="submit"
                disabled={!newTagName.trim()}
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-black text-[13px] font-semibold rounded-md transition-all disabled:opacity-40 cursor-pointer"
              >
                Add Tag
              </button>
            </div>

            <ColorSwatchPicker
              selectedColor={newTagColor}
              onSelect={(col) => setNewTagColor(col)}
              label="Select Tag Color"
            />
          </form>
        )}

        {/* Editorial Grouped List of Tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {tags.map((t) => {
            const style = getTagStyle(t.color);
            const cat = categories.find((c) => c.id === t.categoryId);
            return (
              <div
                key={t.id}
                className="px-3 py-1.5 rounded-full text-[13px] font-medium inline-flex items-center gap-2 transition-all shadow-xs"
                style={{
                  backgroundColor: style.bgSubtle,
                  color: style.color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: style.color }}
                />
                <span>
                  {t.name} {cat ? `(${cat.name})` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTag(t.id, t.name)}
                  className="hover:opacity-75 transition-opacity cursor-pointer ml-0.5"
                  title="Delete global tag"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {tags.length === 0 && !isAddingTag && (
            <p className="text-[13px] text-theme-tertiary italic">
              No global tag templates configured. Tags will default to neutral gray.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
