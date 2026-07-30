"use client";

import { useState, useEffect } from "react";
import { Edit3, X } from "lucide-react";
import { ProjectAsset } from "../types";

interface AssetEditModalProps {
  asset: ProjectAsset | null;
  isOpen: boolean;
  onSave: (id: string, newTitle: string, newUrl?: string) => Promise<void>;
  onClose: () => void;
}

export function AssetEditModal({
  asset,
  isOpen,
  onSave,
  onClose,
}: AssetEditModalProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (asset) {
      setTitle(asset.title);
      setUrl(asset.url);
    }
  }, [asset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave(asset.id, title.trim(), url.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-l2 border border-theme-subtle rounded-xl p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-1 border-b border-theme-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-accent-subtle flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-brand-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-theme-primary tracking-tight">
                Edit Asset Details
              </h3>
              <p className="text-[12px] text-theme-tertiary">
                Update name or link reference for this project asset.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-theme-tertiary hover:text-theme-primary p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-theme-secondary">
              Asset Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Asset title..."
              className="document-input text-sm w-full"
              required
            />
          </div>

          {asset.kind === "link" && (
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-theme-secondary">
                Asset URL / Reference
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="document-input text-sm font-mono w-full"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-[13px] font-medium text-theme-secondary hover:text-theme-primary rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-1.5 bg-brand-accent hover:opacity-90 text-on-accent text-[13px] font-medium rounded-md transition-opacity disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
