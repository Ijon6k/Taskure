"use client";

import { Link2, FileText, GitBranch, ExternalLink, Trash2, Edit3, Check, CheckSquare } from "lucide-react";
import { ProjectAsset } from "../types";

interface AssetListRowProps {
  asset: ProjectAsset;
  onPreview?: ((asset: ProjectAsset) => void) | undefined;
  onEdit?: ((asset: ProjectAsset) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  onOpenTask?: ((taskId: string) => void) | undefined;
  isSelecting?: boolean | undefined;
  isSelected?: boolean | undefined;
  onToggleSelect?: ((id: string) => void) | undefined;
}

export function AssetListRow({
  asset,
  onPreview,
  onEdit,
  onDelete,
  onOpenTask,
  isSelecting = false,
  isSelected = false,
  onToggleSelect,
}: AssetListRowProps) {
  const isImg = asset.kind === "image";
  const taskTitleShort = asset.source.label.replace(/^Task:\s*/i, "Task • ");

  return (
    <div
      onClick={() => {
        if (isSelecting && onToggleSelect && asset.source.kind === "overview") {
          onToggleSelect(asset.id);
        }
      }}
      className={`group flex items-center justify-between py-2 px-3 rounded-lg transition-colors select-none ${
        isSelected
          ? "bg-brand-accent-subtle"
          : "hover:bg-surface-hover"
      } ${isSelecting && asset.source.kind === "overview" ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox in Selection Mode */}
        {isSelecting ? (
          asset.source.kind === "overview" ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect && onToggleSelect(asset.id);
              }}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? "bg-brand-accent border-brand-accent text-on-accent"
                  : "border-theme-subtle bg-surface-l1 text-theme-tertiary hover:border-brand-accent"
              }`}
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          ) : (
            <div className="w-4 h-4 shrink-0" />
          )
        ) : null}

        {/* Kind Icon / Small Thumbnail */}
        {isImg && asset.url ? (
          <div
            onClick={(e) => {
              if (!isSelecting && onPreview) {
                e.stopPropagation();
                onPreview(asset);
              }
            }}
            className="w-7 h-7 rounded-md bg-surface-l0 overflow-hidden shrink-0 cursor-pointer border border-theme-subtle"
          >
            <img
              src={asset.url && !asset.url.startsWith("data:") ? `${asset.url}${asset.url.includes("?") ? "&" : "?"}w=100` : asset.url}
              alt={asset.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          getAssetIcon(asset)
        )}

        {/* Title & Quiet Source Metadata (Aligned Icon & Text) */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="font-medium truncate text-[13.5px] text-theme-primary cursor-pointer hover:text-brand-accent transition-colors"
            onClick={(e) => {
              if (!isSelecting) {
                e.stopPropagation();
                if (isImg && onPreview) {
                  onPreview(asset);
                } else if (asset.url) {
                  window.open(asset.url.startsWith("http") ? asset.url : `https://${asset.url}`, "_blank");
                }
              }
            }}
          >
            {asset.title}
          </span>

          {/* Clickable Source Subtext */}
          {asset.source.kind === "task" ? (
            <span
              onClick={(e) => {
                if (asset.source.taskId && onOpenTask) {
                  e.stopPropagation();
                  onOpenTask(asset.source.taskId);
                }
              }}
              className="text-[12px] text-theme-tertiary font-normal shrink-0 hidden sm:flex items-center gap-1 hover:text-brand-accent transition-colors cursor-pointer"
              title={`Open ${asset.source.label}`}
            >
              <CheckSquare className="w-3 h-3 text-brand-accent shrink-0" />
              <span className="truncate max-w-[140px]">{taskTitleShort}</span>
            </span>
          ) : (
            <span className="text-[12px] text-theme-tertiary font-normal shrink-0 hidden sm:inline">
              Overview
            </span>
          )}
        </div>

        {/* Mono URL Subtext */}
        <span className="text-[12px] text-theme-tertiary font-mono truncate hidden lg:inline max-w-[220px]">
          {asset.url}
        </span>
      </div>

      {/* Right Metadata & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {asset.size && (
          <span className="text-[11px] font-mono text-theme-tertiary hidden sm:inline">
            {asset.size}
          </span>
        )}

        {onEdit && asset.source.kind === "overview" && !isSelecting && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(asset);
            }}
            className="p-1 text-theme-tertiary hover:text-theme-primary rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Edit asset"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}

        {asset.url && !isSelecting && (
          <a
            href={asset.url.startsWith("http") ? asset.url : `https://${asset.url}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 text-theme-tertiary hover:text-theme-primary rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Open link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {onDelete && asset.source.kind === "overview" && !isSelecting && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(asset.id);
            }}
            className="p-1 text-theme-tertiary hover:text-semantic-danger rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Remove item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function getAssetIcon(asset: ProjectAsset) {
  const lower = asset.url.toLowerCase();
  if (lower.includes("github.com") || lower.includes("gitlab.com") || lower.includes("bitbucket.org")) {
    return <GitBranch className="w-4 h-4 text-brand-accent shrink-0" />;
  }
  if (asset.kind === "link") {
    return <Link2 className="w-4 h-4 text-semantic-info shrink-0" />;
  }
  return <FileText className="w-4 h-4 text-semantic-success shrink-0" />;
}
