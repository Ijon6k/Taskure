"use client";

import { useRef } from "react";
import {
  Upload,
  Plus,
  Search,
  CheckSquare,
  Trash2,
  Layers,
  Clipboard,
} from "lucide-react";
import { GroupByOption } from "../types";

interface AssetToolbarProps {
  // Browsing state
  searchQuery: string;
  onSearchChange: (query: string) => void;
  groupBy: GroupByOption;
  onGroupByChange: (mode: GroupByOption) => void;
  isUploading: boolean;
  onUploadFiles: (fileList: FileList) => void;
  onToggleAddLink: () => void;

  // Selection state
  isSelecting: boolean;
  selectedCount: number;
  onToggleSelecting: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRequestDeleteSelected: () => void;
}

export function AssetToolbar({
  searchQuery,
  onSearchChange,
  groupBy,
  onGroupByChange,
  isUploading,
  onUploadFiles,
  onToggleAddLink,
  isSelecting,
  selectedCount,
  onToggleSelecting,
  onSelectAll,
  onClearSelection,
  onRequestDeleteSelected,
}: AssetToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 1. SLEEK SELECTION ACTION BAR (Apple Photos / Linear Style)
  if (isSelecting) {
    return (
      <div className="w-full py-2 px-4 bg-surface-l2 border border-theme-subtle rounded-xl flex items-center justify-between gap-4 animate-in fade-in duration-150 shadow-xs select-none">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-theme-primary tracking-tight">
            {selectedCount} Selected
          </span>

          <div className="flex items-center gap-1.5 border-l border-theme-subtle pl-3 text-[12px]">
            <button
              type="button"
              onClick={onSelectAll}
              className="px-2.5 py-1 bg-surface-l3 hover:bg-surface-hover text-theme-primary font-medium rounded-md transition-colors cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              className="px-2.5 py-1 bg-surface-l3 hover:bg-surface-hover text-theme-secondary hover:text-theme-primary font-medium rounded-md transition-colors cursor-pointer"
            >
              Deselect
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRequestDeleteSelected}
            disabled={selectedCount === 0}
            className="px-3 py-1.5 bg-semantic-danger text-on-accent text-[12.5px] font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-30 cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedCount})</span>
          </button>

          <button
            type="button"
            onClick={onToggleSelecting}
            className="px-3 py-1.5 bg-surface-l3 hover:bg-surface-hover border border-theme-subtle text-theme-primary text-[12.5px] font-medium rounded-lg transition-colors cursor-pointer"
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. NORMAL BROWSING STATE TOOLBAR (Low-chroma borderless aesthetic)
  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-subtle pb-3.5 select-none">
      {/* Left: Search & Group By */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-theme-tertiary absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search assets..."
            className="pl-8 pr-3 py-1.5 bg-surface-l1 border border-theme-subtle rounded-lg text-[13px] text-theme-primary placeholder-theme-tertiary outline-none focus:border-brand-accent w-48 sm:w-60 transition-colors"
          />
        </div>

        {/* Group By Selector */}
        <div className="flex items-center border border-theme-subtle rounded-lg bg-surface-l1 p-0.5 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => onGroupByChange("source")}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
              groupBy === "source"
                ? "bg-surface-l3 text-theme-primary"
                : "text-theme-tertiary hover:text-theme-primary"
            }`}
            title="Group by Source / Ownership"
          >
            <Layers className="w-3 h-3 text-brand-accent" />
            <span>By Source</span>
          </button>

          <button
            type="button"
            onClick={() => onGroupByChange("kind")}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              groupBy === "kind"
                ? "bg-surface-l3 text-theme-primary"
                : "text-theme-tertiary hover:text-theme-primary"
            }`}
            title="Group by Asset Type"
          >
            <span>By Type</span>
          </button>
        </div>
      </div>

      {/* Right: Low-chroma Actions & Clipboard Hint */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className="hidden md:flex items-center gap-1 px-2 py-1 bg-surface-l1 border border-theme-subtle rounded-md text-[11px] text-theme-tertiary"
          title="You can press Ctrl+V or Cmd+V anywhere on this tab to paste images directly from your clipboard"
        >
          <Clipboard className="w-3 h-3 text-brand-accent" />
          <span>Paste Image</span>
          <kbd className="px-1 py-0.2 bg-surface-l3 rounded border border-theme-subtle font-mono text-[10px]">
            Ctrl+V
          </kbd>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          multiple
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-3 py-1.5 bg-surface-l2 hover:bg-surface-hover border border-theme-subtle text-theme-primary text-[13px] font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5 text-brand-accent" />
          <span>{isUploading ? "Uploading..." : "Upload File"}</span>
        </button>

        <button
          type="button"
          onClick={onToggleAddLink}
          className="px-3 py-1.5 bg-surface-l2 hover:bg-surface-hover border border-theme-subtle text-theme-primary text-[13px] font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Link</span>
        </button>

        <button
          type="button"
          onClick={onToggleSelecting}
          className="px-3 py-1.5 bg-brand-accent hover:opacity-90 text-on-accent text-[13px] font-medium rounded-lg transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>
      </div>
    </div>
  );
}
