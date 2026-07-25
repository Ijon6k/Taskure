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
      {/* Existing Resources List */}
      <div className="space-y-2">
        {resources.map((res, index) => (
          <div
            key={res.id || res.url || `res-${index}`}
            className="px-3 py-2.5 bg-surface-l4 border border-theme-default rounded-md flex items-center justify-between text-[14px] text-theme-primary/90 hover:text-theme-primary hover:border-brand-accent/40 transition-colors group"
          >
            <a
              href={res.url.startsWith("http") ? res.url : `https://${res.url}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 truncate flex-1 min-w-0"
            >
              <LinkIcon className="w-3.5 h-3.5 text-theme-secondary group-hover:text-brand-accent transition-colors shrink-0" />
              <span className="font-medium truncate">{res.title}</span>
              <span className="text-[12px] text-theme-secondary font-mono truncate opacity-60">
                ({res.url})
              </span>
            </a>

            {isEditingInline ? (
              <button
                type="button"
                onClick={() => handleRemoveResource(res.id)}
                className="p-1 text-semantic-danger hover:text-red-300 hover:bg-semantic-danger-subtle rounded-md transition-colors shrink-0 ml-2"
                title="Remove resource"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ExternalLink className="w-3.5 h-3.5 text-theme-secondary opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
            )}
          </div>
        ))}
      </div>

      {/* Inline Form to Add New Custom Resource Link (Only in Edit Mode) */}
      {isEditingInline && (
        <div className="p-3 bg-surface-l3 border border-theme-default rounded-md space-y-2.5 animate-in fade-in duration-150">
          <span className="text-[11px] text-theme-secondary font-mono block uppercase tracking-[0.5px]">
            Add Custom Link
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={newResTitle}
              onChange={(e) => setNewResTitle(e.target.value)}
              placeholder="Title (e.g. Figma Specs)"
              className="px-2.5 py-1.5 bg-surface-l4 border border-theme-default rounded-md text-[13px] text-theme-primary placeholder:text-theme-tertiary outline-none focus:border-brand-accent"
            />
            <input
              type="text"
              value={newResUrl}
              onChange={(e) => setNewResUrl(e.target.value)}
              placeholder="URL (e.g. https://...)"
              className="px-2.5 py-1.5 bg-surface-l4 border border-theme-default rounded-md text-[13px] text-theme-primary placeholder:text-theme-tertiary outline-none focus:border-brand-accent font-mono"
            />
          </div>
          <button
            type="button"
            onClick={handleAddResource}
            disabled={!newResTitle.trim() || !newResUrl.trim()}
            className="px-3 py-1 bg-brand-accent-subtle hover:bg-brand-accent/20 text-brand-accent text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        </div>
      )}

      {/* Strategy Notes (In-Place Transformation) */}
      {isEditingInline ? (
        <div className="space-y-1 pt-1">
          <label className="text-[11px] font-mono text-theme-secondary uppercase tracking-[0.5px]">
            Strategy Notes
          </label>
          <textarea
            rows={2}
            value={strategyNotes}
            onChange={(e) => setStrategyNotes(e.target.value)}
            placeholder="Add strategy notes..."
            className="w-full bg-surface-l3 hover:bg-surface-l4 focus:bg-surface-l4 border border-theme-default focus:border-brand-accent rounded-md p-3 text-[14px] text-theme-primary outline-none transition-colors resize-none leading-[22.75px]"
          />
        </div>
      ) : (
        strategyNotes && (
          <div className="p-3 bg-surface-l2 border border-theme-default rounded-md text-[14px] text-theme-primary/80 leading-[22.75px]">
            {strategyNotes}
          </div>
        )
      )}
    </div>
  );
}
