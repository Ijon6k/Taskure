"use client";

import { Link as LinkIcon, Trash2, ExternalLink, Plus, GitBranch } from "lucide-react";
import { ResourceLinkItem } from "@/lib/api";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";

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

function getResourceIcon(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes("github.com") || lower.includes("gitlab.com") || lower.includes("bitbucket.org")) {
    return <GitBranch className="w-3.5 h-3.5 text-brand-accent shrink-0" />;
  }
  return <LinkIcon className="w-3.5 h-3.5 text-theme-tertiary group-hover:text-brand-accent transition-colors shrink-0" />;
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
        <div className="space-y-1">
          {resources.map((res, index) => (
            <a
              key={res.id || res.url || `res-${index}`}
              href={res.url.startsWith("http") ? res.url : `https://${res.url}`}
              target="_blank"
              rel="noreferrer"
              className="subtle-row group flex items-center justify-between p-2 rounded-md hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {getResourceIcon(res.url)}
                <span className="font-medium truncate text-[14px] text-theme-primary">{res.title}</span>
                <span className="text-[12px] text-theme-tertiary font-mono truncate hidden sm:inline">
                  {res.url}
                </span>
              </div>
              {isEditingInline ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveResource(res.id);
                  }}
                  className="p-1 text-theme-tertiary hover:text-semantic-danger rounded transition-colors shrink-0 ml-2"
                  title="Remove resource"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <ExternalLink className="w-3.5 h-3.5 text-theme-tertiary shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </a>
          ))}
        </div>
      )}

      {resources.length === 0 && !isEditingInline && (
        <p className="text-[13px] text-theme-tertiary py-1">
          No repository links or resources added yet. Click &quot;Edit&quot; to add repository links.
        </p>
      )}

      {/* Inline Add Resource Form (in edit mode) */}
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
              placeholder="Title (e.g. Frontend Repo)"
              className="flex-1 document-input text-sm"
            />
            <input
              type="text"
              value={newResUrl}
              onChange={(e) => setNewResUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddResource();
              }}
              placeholder="https://github.com/org/repo"
              className="flex-1 document-input text-sm font-mono"
            />
            <button
              type="button"
              onClick={handleAddResource}
              disabled={!newResTitle.trim() || !newResUrl.trim()}
              className="px-3 py-1.5 bg-brand-accent text-on-accent text-[12px] font-medium rounded-md hover:bg-brand-accent-hover transition-colors disabled:opacity-30 shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Strategy Notes */}
      <hr className="section-divider" />
      {isEditingInline ? (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-theme-secondary uppercase tracking-wider">
            Strategy Notes
          </label>
          <AutoResizeTextarea
            minRows={3}
            value={strategyNotes}
            onChange={(e) => setStrategyNotes(e.target.value)}
            placeholder="Strategy notes and objectives..."
            className="document-textarea"
          />
        </div>
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
