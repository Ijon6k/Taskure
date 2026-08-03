"use client";

import { useState } from "react";
import { FolderOpen, Link2, X, Image as ImageIcon } from "lucide-react";
import { ProjectData } from "@/lib/api";
import { PageContainer } from "@/components/ui/page-container";
import { useUIStore } from "@/store/use-ui-store";
import { useProjectAssets } from "./resources/hooks/use-project-assets";
import { AssetToolbar } from "./resources/components/asset-toolbar";
import { AssetGroupSection } from "./resources/components/asset-group-section";
import { AssetLightboxModal } from "./resources/components/asset-lightbox-modal";
import { AssetEditModal } from "./resources/components/asset-edit-modal";
import { UploadQueueCard } from "./resources/components/upload-queue-card";
import { DeleteConfirmDialog } from "./resources/components/delete-confirm-dialog";
import { AiContextManager } from "./resources/components/ai-context-manager";
import { ProjectAsset } from "./resources/types";

interface ProjectResourcesTabProps {
  project: ProjectData | null;
  onRefreshProject?: (() => void) | undefined;
  onOpenTask?: ((taskId: string) => void) | undefined;
}

export function ProjectResourcesTab({
  project,
  onRefreshProject,
  onOpenTask,
}: ProjectResourcesTabProps) {
  const { setSelectedTaskId } = useUIStore();

  const {
    searchQuery,
    setSearchQuery,
    groupBy,
    setGroupBy,
    allAssets,
    assetGroups,
    isUploading,
    uploadQueue,
    dismissQueueItem,
    isSelecting,
    selectedIds,
    previewAsset,
    setPreviewAsset,
    toggleSelectionMode,
    toggleSelect,
    selectAll,
    clearSelection,
    addLinkAsset,
    uploadFiles,
    editAsset,
    deleteAsset,
    bulkDeleteAssets,
  } = useProjectAssets(project?.id || "", onRefreshProject);

  // Modals & Panels State
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"explorer" | "docs">("explorer");

  // Edit Target State
  const [editingAsset, setEditingAsset] = useState<ProjectAsset | null>(null);

  // Delete Target Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<
    { mode: "single"; item: ProjectAsset } | { mode: "bulk"; items: ProjectAsset[] } | null
  >(null);

  const handleAddLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl.trim()) return;
    await addLinkAsset(newLinkUrl, newLinkTitle);
    setNewLinkUrl("");
    setNewLinkTitle("");
    setShowAddLink(false);
  };

  const handleRequestDeleteSingle = (id: string) => {
    const asset = allAssets.find((a) => a.id === id);
    if (asset) {
      setDeleteTarget({ mode: "single", item: asset });
    }
  };

  const handleRequestDeleteBulk = () => {
    if (selectedIds.size === 0) return;
    const items = Array.from(selectedIds)
      .map((id) => allAssets.find((a) => a.id === id))
      .filter((a): a is ProjectAsset => Boolean(a));
    if (items.length === 0) return;
    setDeleteTarget({ mode: "bulk", items });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.mode === "single") {
      await deleteAsset(deleteTarget.item);
    } else {
      await bulkDeleteAssets(deleteTarget.items);
    }
    setDeleteTarget(null);
  };

  const handleSaveEdit = async (id: string, newTitle: string, newUrl?: string) => {
    await editAsset(id, newTitle, newUrl);
  };

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    onOpenTask?.(taskId);
  };

  return (
    <div className="flex-1 overflow-y-auto font-sans flex flex-col items-center text-theme-primary">
      <PageContainer variant="wide" className="space-y-8!">
        {/* Workspace Editorial Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-brand-accent-subtle flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-brand-accent" />
              </div>
              <h1 className="text-xl font-semibold text-theme-primary tracking-tight">
                Project Asset Explorer
              </h1>
            </div>
            <p className="text-[13px] text-theme-tertiary">
              Single location to explore all assets and files organized by project ownership.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-surface-l1 p-1 border border-theme-subtle rounded-md text-[13px]">
            <button
              type="button"
              onClick={() => setActiveTab("explorer")}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === "explorer"
                  ? "bg-surface-l3 text-theme-primary"
                  : "text-theme-tertiary hover:text-theme-primary"
              }`}
            >
              All Assets ({allAssets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("docs")}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === "docs"
                  ? "bg-surface-l3 text-theme-primary"
                  : "text-theme-tertiary hover:text-theme-primary"
              }`}
            >
              Documentation
            </button>
          </div>
        </div>

        {activeTab === "explorer" ? (
          <>
            {/* Swappable Toolbar */}
            <AssetToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              isUploading={isUploading}
              onUploadFiles={uploadFiles}
              onToggleAddLink={() => setShowAddLink(!showAddLink)}
              isSelecting={isSelecting}
              selectedCount={selectedIds.size}
              onToggleSelecting={toggleSelectionMode}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onRequestDeleteSelected={handleRequestDeleteBulk}
            />

            {/* Inline Add Link Form */}
            {showAddLink && (
              <form
                onSubmit={handleAddLinkSubmit}
                className="p-4 bg-surface-l3 border border-theme-subtle rounded-md space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-theme-primary flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-brand-accent" />
                    Add Asset Link Reference
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddLink(false)}
                    className="text-theme-tertiary hover:text-theme-primary p-1 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="Title (e.g. Design Specs / Figma)"
                    className="document-input text-sm"
                  />
                  <input
                    type="text"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://figma.com/file/... or https://github.com/..."
                    className="document-input text-sm font-mono"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddLink(false)}
                    className="px-3 py-1 text-[13px] text-theme-secondary hover:text-theme-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newLinkUrl.trim()}
                    className="px-3.5 py-1 bg-brand-accent text-on-accent text-[13px] font-medium rounded-md disabled:opacity-40 cursor-pointer"
                  >
                    Save Asset
                  </button>
                </div>
              </form>
            )}

            {/* Active Live Upload Queue Section */}
            {uploadQueue.length > 0 && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                <h4 className="text-[12px] font-semibold uppercase tracking-wider text-theme-tertiary flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
                  <span>Uploading Files ({uploadQueue.length})</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                  {uploadQueue.map((queueItem) => (
                    <UploadQueueCard
                      key={queueItem.id}
                      item={queueItem}
                      onDismiss={dismissQueueItem}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Asset Groups Listing */}
            {assetGroups.length === 0 && uploadQueue.length === 0 ? (
              <div className="py-16 text-center text-theme-tertiary space-y-2 border border-dashed border-theme-subtle rounded-md">
                <FolderOpen className="w-8 h-8 mx-auto text-theme-tertiary/60" />
                <p className="text-[14px]">No project assets found.</p>
                <p className="text-[12px] text-theme-tertiary">
                  Upload files, attach images to tasks, or click &quot;Add Link&quot; to populate your project assets.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {assetGroups.map((group) => (
                  <AssetGroupSection
                    key={group.id}
                    group={group}
                    onPreview={setPreviewAsset}
                    onEdit={setEditingAsset}
                    onDelete={handleRequestDeleteSingle}
                    onOpenTask={handleOpenTask}
                    isSelecting={isSelecting}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <AiContextManager projectId={project?.id || ""} contexts={project?.contexts} />
        )}
      </PageContainer>

      {/* Lightbox Inspection Modal */}
      <AssetLightboxModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />

      {/* Asset Edit Modal */}
      <AssetEditModal
        asset={editingAsset}
        isOpen={Boolean(editingAsset)}
        onSave={handleSaveEdit}
        onClose={() => setEditingAsset(null)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={Boolean(deleteTarget)}
        count={deleteTarget?.mode === "bulk" ? deleteTarget.items.length : 1}
        itemTitle={deleteTarget?.mode === "single" ? deleteTarget.item.title : undefined}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
