"use client";

import { Link as LinkIcon, Trash2, ExternalLink, Plus } from "lucide-react";
import { ResourceLinkItem } from "@/lib/api";

interface ProjectResourcesSectionProps {
  isEditingInline: boolean;
  resources: ResourceLinkItem[];
  newResTitle: string;
  setNewResTitle: (val: string) => void;
  newResUrl: string;
  setNewResUrl: (val: string) => void;
  handleAddResource: () => void;
  handleRemoveResource: (id: string) => void;
  strategyNotes: string;
  setStrategyNotes: (val: string) => void;
}

export function ProjectResourcesSection({
  isEditingInline,
  resources,
  newResTitle,
  setNewResTitle,
  newResUrl,
  setNewResUrl,
  handleAddResource,
  handleRemoveResource,
  strategyNotes,
  setStrategyNotes,
}: ProjectResourcesSectionProps) {
  return (
    <div className="space-y-3">
      {/* Resources List — flat rows, hover reveal */}
      {resources.length > 0 && (
        <div className="space-y-0">
          {resources.map((res, index) => (
            <a
              key={res.id || res.url || `res-${index}`}
              href={res.url.startsWith("http") ? res.url : `https://${res.url}`}
              target="_blank"
              rel="noreferrer"
              className="subtle-row group"
            >
              <LinkIcon className="w-3.5 h-3.5 text-theme-tertiary group-hover:text-brand-accent transition-colors shrink-0" />
              <span className="font-medium truncate">{res.title}</span>
              <span className="text-[12px] text-theme-tertiary font-mono truncate hidden sm:inline">
                {res.url}
              </span>
              {isEditingInline ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveResource(res.id);
                  }}
                  className="p-1 text-theme-tertiary hover:text-semantic-danger rounded transition-colors shrink-0 ml-auto opacity-0 group-hover:opacity-100"
                  title="Remove resource"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <ExternalLink className="w-3.5 h-3.5 text-theme-tertiary shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </a>
          ))}
        </div>
      )}

      {resources.length === 0 && (
        <p className="text-[13px] text-theme-tertiary py-1">
          No resources added yet.
        </p>
      )}

      {/* Inline Add Resource Form (only in edit mode) */}
      {isEditingInline && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <input
              type="text"
              value={newResTitle}
              onChange={(e) => setNewResTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddResource();
              }}
              placeholder="Link title"
              className="flex-1 document-input text-sm"
            />
            <input
              type="text"
              value={newResUrl}
              onChange={(e) => setNewResUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddResource();
              }}
              placeholder="https://..."
              className="flex-1 document-input text-sm font-mono"
            />
            <button
              type="button"
              onClick={handleAddResource}
              disabled={!newResTitle.trim() || !newResUrl.trim()}
              className="px-3 py-1.5 text-brand-accent text-[12px] font-medium rounded-md hover:bg-brand-accent-subtle transition-colors disabled:opacity-30 shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Strategy Notes */}
      <hr className="section-divider" />
      {isEditingInline ? (
        <textarea
          rows={3}
          value={strategyNotes}
          onChange={(e) => setStrategyNotes(e.target.value)}
          placeholder="Strategy notes..."
          className="document-textarea"
        />
      ) : (
        strategyNotes ? (
          <p className="text-[14px] text-theme-primary/80 leading-relaxed whitespace-pre-wrap">
            {strategyNotes}
          </p>
        ) : null
      )}
    </div>
  );
}
