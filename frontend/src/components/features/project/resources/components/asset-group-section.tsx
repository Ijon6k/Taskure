"use client";

import { useMemo } from "react";
import { FolderOpen, CheckSquare, Image as ImageIcon } from "lucide-react";
import { AssetGroup, ProjectAsset } from "../types";
import { AssetGridCard } from "./asset-grid-card";
import { AssetListRow } from "./asset-list-row";

interface AssetGroupSectionProps {
  group: AssetGroup;
  onPreview?: ((asset: ProjectAsset) => void) | undefined;
  onEdit?: ((asset: ProjectAsset) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  onOpenTask?: ((taskId: string) => void) | undefined;
  isSelecting?: boolean | undefined;
  selectedIds?: Set<string> | undefined;
  onToggleSelect?: ((id: string) => void) | undefined;
}

export function AssetGroupSection({
  group,
  onPreview,
  onEdit,
  onDelete,
  onOpenTask,
  isSelecting = false,
  selectedIds = new Set(),
  onToggleSelect,
}: AssetGroupSectionProps) {
  const photoAssets = useMemo(() => {
    return group.assets.filter((a) => a.kind === "image");
  }, [group.assets]);

  const docAndLinkAssets = useMemo(() => {
    return group.assets.filter((a) => a.kind !== "image");
  }, [group.assets]);

  const isTaskGroup = group.title.startsWith("Task:");

  return (
    <div className="space-y-3.5 pt-1 select-none">
      {/* Editorial Group Header */}
      <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
        <div className="flex items-center gap-2">
          {isTaskGroup ? (
            <CheckSquare className="w-4 h-4 text-brand-accent shrink-0" />
          ) : (
            <FolderOpen className="w-4 h-4 text-theme-tertiary shrink-0" />
          )}

          <h3 className="text-sm font-semibold text-theme-primary tracking-tight">
            {group.title}
          </h3>
        </div>
      </div>

      {/* 1. Photos Canvas Grid View */}
      {photoAssets.length > 0 && (
        <div className="space-y-2.5">
          {docAndLinkAssets.length > 0 && (
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-theme-tertiary flex items-center gap-1.5 pt-1">
              <ImageIcon className="w-3.5 h-3.5 text-brand-accent" />
              <span>Photos ({photoAssets.length})</span>
            </h4>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {photoAssets.map((asset) => (
              <AssetGridCard
                key={asset.id}
                asset={asset}
                onPreview={onPreview}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenTask={onOpenTask}
                isSelecting={isSelecting}
                isSelected={selectedIds.has(asset.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. Documents & Links List View */}
      {docAndLinkAssets.length > 0 && (
        <div className="space-y-1">
          {photoAssets.length > 0 && (
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-theme-tertiary pt-2">
              Documents &amp; Links ({docAndLinkAssets.length})
            </h4>
          )}
          <div className="space-y-0.5">
            {docAndLinkAssets.map((asset) => (
              <AssetListRow
                key={asset.id}
                asset={asset}
                onPreview={onPreview}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenTask={onOpenTask}
                isSelecting={isSelecting}
                isSelected={selectedIds.has(asset.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
