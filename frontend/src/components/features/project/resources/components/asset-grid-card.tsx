"use client";

import { Eye, ExternalLink, Trash2, Edit3, Check, CheckSquare } from "lucide-react";
import { ProjectAsset } from "../types";
import { ThumbnailImage } from "@/components/ui/thumbnail-image";

interface AssetGridCardProps {
  asset: ProjectAsset;
  onPreview?: ((asset: ProjectAsset) => void) | undefined;
  onEdit?: ((asset: ProjectAsset) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  onOpenTask?: ((taskId: string) => void) | undefined;
  isSelecting?: boolean | undefined;
  isSelected?: boolean | undefined;
  onToggleSelect?: ((id: string) => void) | undefined;
}

export function AssetGridCard({
  asset,
  onPreview,
  onEdit,
  onDelete,
  onOpenTask,
  isSelecting = false,
  isSelected = false,
  onToggleSelect,
}: AssetGridCardProps) {
  const handleClick = () => {
    if (isSelecting && onToggleSelect) {
      onToggleSelect(asset.id);
    } else if (onPreview) {
      onPreview(asset);
    }
  };

  const taskTitleShort = asset.source.label.replace(/^Task:\s*/i, "Task • ");

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col transition-all select-none cursor-pointer [content-visibility:auto] [contain-intrinsic-size:240px] ${
        isSelected ? "opacity-90" : ""
      }`}
    >
      {/* 1. Image Canvas */}
      <div
        className={`relative aspect-[4/3] w-full rounded-md overflow-hidden bg-surface-l0 border transition-all ${
          isSelected
            ? "border-brand-accent ring-2 ring-brand-accent/40"
            : "border-theme-subtle group-hover:border-theme-default"
        }`}
      >
        {asset.url ? (
          <ThumbnailImage
            src={asset.url}
            alt={asset.title}
            width={400}
            loading="lazy"
            expectsVariants={Boolean(asset.previewUrl)}
            className="absolute inset-0"
            imgClassName="w-full h-full object-cover group-hover:scale-102"
            skeleton={
              <div className="absolute inset-0 bg-surface-l2 animate-pulse flex items-center justify-center z-10">
                <span className="w-5 h-5 rounded-full border-2 border-theme-subtle border-t-brand-accent animate-spin" />
              </div>
            }
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-theme-tertiary font-mono text-xs">
            No Preview
          </div>
        )}

        {/* Checkbox (Selection Mode) */}
        {isSelecting && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect && onToggleSelect(asset.id);
            }}
            className={`absolute top-2.5 left-2.5 z-20 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer shadow-xs ${
              isSelected
                ? "bg-brand-accent border-brand-accent text-on-accent"
                : "bg-surface-l2 border-theme-default text-theme-tertiary hover:border-brand-accent"
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        )}

        {/* Hover Action Controls */}
        {!isSelecting && (
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {asset.url && onPreview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(asset);
                }}
                className="p-1.5 bg-surface-l3 hover:bg-surface-hover text-theme-primary rounded-md transition-colors shadow-2xs cursor-pointer border border-theme-subtle"
                title="Expand Preview"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}

            {onEdit && asset.source.kind === "overview" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(asset);
                }}
                className="p-1.5 bg-surface-l3 hover:bg-surface-hover text-theme-primary rounded-md transition-colors shadow-2xs cursor-pointer border border-theme-subtle"
                title="Edit Asset"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            {asset.url && (
              <a
                href={asset.url.startsWith("http") ? asset.url : `https://${asset.url}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 bg-surface-l3 hover:bg-surface-hover text-theme-primary rounded-md transition-colors shadow-2xs border border-theme-subtle"
                title="Open Link"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {onDelete && asset.source.kind === "overview" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(asset.id);
                }}
                className="p-1.5 bg-surface-l3 hover:bg-semantic-danger text-theme-primary hover:text-on-accent rounded-md transition-colors shadow-2xs cursor-pointer border border-theme-subtle"
                title="Delete Asset"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Quiet Editorial Metadata (Aligned Icon & Clickable Task Link) */}
      <div className="pt-2.5 px-0.5 space-y-0.5 min-w-0">
        <p className="text-[13.5px] font-medium text-theme-primary truncate leading-snug" title={asset.title}>
          {asset.title}
        </p>

        <div className="flex items-center justify-between text-[12px] text-theme-tertiary gap-2">
          {/* Clickable Source Origin */}
          {asset.source.kind === "task" ? (
            <span
              onClick={(e) => {
                if (asset.source.taskId && onOpenTask) {
                  e.stopPropagation();
                  onOpenTask(asset.source.taskId);
                }
              }}
              className="truncate flex items-center gap-1 font-normal text-theme-tertiary hover:text-brand-accent transition-colors cursor-pointer"
              title={`Open ${asset.source.label}`}
            >
              <CheckSquare className="w-3 h-3 text-brand-accent shrink-0" />
              <span className="truncate max-w-[140px]">{taskTitleShort}</span>
            </span>
          ) : (
            <span className="text-theme-tertiary font-normal truncate">Overview</span>
          )}

          {asset.size && <span className="font-mono text-[11px] shrink-0 text-theme-tertiary">{asset.size}</span>}
        </div>
      </div>
    </div>
  );
}
