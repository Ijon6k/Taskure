"use client";

import { useState, useRef, useMemo } from "react";
import {
  Plus,
  ArrowRight,
  ChevronDown,
  Link2,
  FileText,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { ResourceLinkItem, api } from "@/lib/api";
import { normalizeStorageUrl } from "@/lib/image-url";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { AssetGridCard } from "../resources/components/asset-grid-card";
import { AssetListRow } from "../resources/components/asset-list-row";
import { AssetLightboxModal } from "../resources/components/asset-lightbox-modal";
import { AssetEditModal } from "../resources/components/asset-edit-modal";
import { UploadQueueCard, UploadQueueItem } from "../resources/components/upload-queue-card";
import { DeleteConfirmDialog } from "../resources/components/delete-confirm-dialog";
import { ProjectAsset, AssetKind } from "../resources/types";
import { toast } from "sonner";

interface ProjectResourcesSectionProps {
  projectId?: string | undefined;
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
  onOpenResourcesTab?: (() => void) | undefined;
  onAddPhotoResource?: ((items: ResourceLinkItem[]) => void) | undefined;
  onUpdateResource?: ((id: string, title: string, url?: string) => void) | undefined;
}

const PHOTO_INITIAL_LIMIT = 6;

export function ProjectResourcesSection({
  projectId,
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
  onOpenResourcesTab,
  onAddPhotoResource,
  onUpdateResource,
}: ProjectResourcesSectionProps) {
  const [visiblePhotoCount, setVisiblePhotoCount] = useState(PHOTO_INITIAL_LIMIT);
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<ProjectAsset | null>(null);
  const [editingAsset, setEditingAsset] = useState<ProjectAsset | null>(null);

  // Live Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

  // Single Delete Target Confirmation State
  const [deleteTargetItem, setDeleteTargetItem] = useState<{ id: string; title: string } | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Map Overview resources strictly into ProjectAsset array
  const overviewAssets = useMemo<ProjectAsset[]>(() => {
    return resources.map((res, index) => {
      const urlStr = res?.url ?? "";
      const isImg = isImageFileName(res?.title || "") || Boolean(urlStr.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i));
      const kind: AssetKind = res?.type === "image" || isImg ? "image" : urlStr.startsWith("http") ? "link" : "file";
      return {
        id: res?.id || `res-${index}`,
        title: res?.title || "Resource",
        url: normalizeStorageUrl(urlStr),
        previewUrl: res?.preview_url ? normalizeStorageUrl(res.preview_url) : undefined,
        kind,
        size: res?.size,
        mimeType: res?.mime_type,
        createdAt: res?.created_at,
        source: {
          kind: "overview",
          label: "Project Overview",
        },
      };
    });
  }, [resources]);

  // Separate Photos vs Links & Files
  const photoAssets = useMemo(() => {
    return overviewAssets.filter((a) => a.kind === "image");
  }, [overviewAssets]);

  const docAndLinkAssets = useMemo(() => {
    return overviewAssets.filter((a) => a.kind !== "image");
  }, [overviewAssets]);

  const displayedPhotos = photoAssets.slice(0, visiblePhotoCount);
  const hasMorePhotos = visiblePhotoCount < photoAssets.length;

  const processBatchUpload = async (files: FileList, isPhoto: boolean) => {
    if (!files || files.length === 0 || !projectId) return;

    const filesArray = Array.from(files);
    const initialQueue: UploadQueueItem[] = filesArray.map((f, i) => ({
      id: `queue-${Date.now()}-${i}`,
      title: f.name,
      progress: 15,
      status: "uploading",
    }));

    setUploadQueue((prev) => [...prev, ...initialQueue]);
    let successCount = 0;

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      if (!file) continue;
      const queueId = initialQueue[i]?.id;

      // Local preview DataURL for immediate queue thumbnail
      let previewUrl: string | undefined = undefined;
      if (isPhoto) {
        try {
          previewUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
          });
        } catch {
          // ignore
        }
      }

      if (queueId) {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === queueId ? { ...q, progress: 40, previewUrl } : q
          )
        );
      }

      try {
        if (queueId) {
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === queueId ? { ...q, progress: 75, status: "persisting" } : q))
          );
        }

        // Upload exact original file directly to MinIO Go API endpoint
        const res = await api.uploadProjectResource(projectId, file);
        successCount++;

        // Immediately sync state with returned resources array to eliminate vanishing flash
        if (res.settings?.resources && onAddPhotoResource) {
          onAddPhotoResource(res.settings.resources);
        }

        if (queueId) {
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === queueId ? { ...q, progress: 100 } : q))
          );
        }

        setTimeout(() => {
          setUploadQueue((prev) => prev.filter((q) => q.id !== queueId));
        }, 300);
      } catch (err) {
        if (queueId) {
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === queueId
                ? { ...q, status: "error", error: (err as Error).message }
                : q
            )
          );
        }
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} ${isPhoto ? "photo(s)" : "file(s)"} saved to MinIO storage!`);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processBatchUpload(e.target.files, true);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processBatchUpload(e.target.files, false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const dismissQueueItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const onRequestDelete = (id: string) => {
    const target = overviewAssets.find((a) => a.id === id);
    if (target) {
      setDeleteTargetItem({ id: target.id, title: target.title });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTargetItem) {
      handleRemoveResource(deleteTargetItem.id);
      setDeleteTargetItem(null);
    }
  };

  const handleSaveEdit = async (id: string, newTitle: string, newUrl?: string) => {
    if (onUpdateResource) {
      onUpdateResource(id, newTitle, newUrl);
    }
  };

  return (
    <div className="space-y-5">
      {/* Overview Resources Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-subtle pb-3">
        <div>
          <h3 className="section-title !mb-0">Resources &amp; Attachments</h3>
          <p className="text-[12px] text-theme-tertiary pt-0.5">
            Links, documentation files, and photo gallery uploaded directly to Overview.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Action: Add Link */}
          <button
            type="button"
            onClick={() => setShowAddLinkForm(!showAddLinkForm)}
            className="px-2.5 py-1 bg-surface-l2 hover:bg-surface-hover text-theme-primary text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer border border-theme-subtle"
          >
            <Link2 className="w-3.5 h-3.5 text-semantic-info" />
            <span>Add Link</span>
          </button>

          {/* Action: Upload File */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".pdf,.doc,.docx,.zip,.txt,.json,.csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 bg-surface-l2 hover:bg-surface-hover text-theme-primary text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer border border-theme-subtle"
          >
            <FileText className="w-3.5 h-3.5 text-semantic-success" />
            <span>Upload File</span>
          </button>

          {/* Action: Upload Photo */}
          <input
            type="file"
            ref={photoInputRef}
            onChange={handlePhotoUpload}
            multiple
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="px-2.5 py-1 bg-brand-accent hover:opacity-90 text-on-accent text-[12px] font-medium rounded-md transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>

          {onOpenResourcesTab && (
            <button
              type="button"
              onClick={onOpenResourcesTab}
              className="text-[12px] font-medium text-brand-accent hover:underline flex items-center gap-1 cursor-pointer pl-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Add Link Form */}
      {showAddLinkForm && (
        <div className="p-3 bg-surface-l2 border border-theme-subtle rounded-md space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-theme-primary flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-semantic-info" />
              Add Overview Link Reference
            </span>
            <button
              type="button"
              onClick={() => setShowAddLinkForm(false)}
              className="text-theme-tertiary hover:text-theme-primary p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newResTitle}
              onChange={(e) => setNewResTitle(e.target.value)}
              placeholder="Title (e.g. Design Specs / Figma)"
              className="flex-1 document-input text-xs"
            />
            <input
              type="text"
              value={newResUrl}
              onChange={(e) => setNewResUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 document-input text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => {
                handleAddResource();
                setShowAddLinkForm(false);
              }}
              disabled={!newResTitle.trim() || !newResUrl.trim()}
              className="px-3 py-1 bg-brand-accent text-on-accent text-xs font-medium rounded-md disabled:opacity-40 cursor-pointer"
            >
              Save Link
            </button>
          </div>
        </div>
      )}

      {/* Section 1: Links & Files */}
      {docAndLinkAssets.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[13px] font-medium text-theme-tertiary">
            Documents &amp; Links ({docAndLinkAssets.length})
          </h4>
          <div className="space-y-0.5">
            {docAndLinkAssets.map((asset) => (
              <AssetListRow
                key={asset.id}
                asset={asset}
                onPreview={setPreviewAsset}
                onEdit={setEditingAsset}
                onDelete={onRequestDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Photo Gallery Grid (Including Live Upload Queue Cards) */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-medium text-theme-tertiary flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-brand-accent" />
            <span>Photo Gallery ({photoAssets.length})</span>
          </h4>
        </div>

        {displayedPhotos.length > 0 || uploadQueue.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {/* Live Upload Queue Cards */}
            {uploadQueue.map((queueItem) => (
              <UploadQueueCard
                key={queueItem.id}
                item={queueItem}
                onDismiss={dismissQueueItem}
              />
            ))}

            {/* Existing Uploaded Photos */}
            {displayedPhotos.map((asset) => (
              <AssetGridCard
                key={asset.id}
                asset={asset}
                onPreview={setPreviewAsset}
                onEdit={setEditingAsset}
                onDelete={onRequestDelete}
              />
            ))}
          </div>
        ) : (
          <div className="py-6 border border-dashed border-theme-subtle rounded-md text-center text-theme-tertiary space-y-1">
            <p className="text-[13px]">No Overview photos uploaded yet.</p>
            <p className="text-[11px] text-theme-tertiary">
              Click &quot;Upload Photo&quot; above to add images directly to Overview.
            </p>
          </div>
        )}

        {/* Photo Gallery Load More Pagination */}
        {hasMorePhotos && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setVisiblePhotoCount((prev) => prev + PHOTO_INITIAL_LIMIT)}
              className="px-3.5 py-1.5 border border-theme-subtle hover:bg-surface-hover text-theme-secondary hover:text-theme-primary font-medium text-[12px] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Load More Photos ({photoAssets.length - visiblePhotoCount} remaining)</span>
            </button>
          </div>
        )}
      </div>

      {/* Inline Add Resource Form (in edit mode) */}
      {isEditingInline && (
        <div className="space-y-2 pt-2 border-t border-theme-subtle">
          <span className="text-[12px] font-semibold text-theme-secondary">Quick Link Adder</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={newResTitle}
              onChange={(e) => setNewResTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddResource();
              }}
              placeholder="Title (e.g. Frontend Repo / Design Spec)"
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
              className="px-3 py-1.5 bg-brand-accent text-on-accent text-[12px] font-medium rounded-md hover:bg-brand-accent-hover transition-colors disabled:opacity-30 shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Strategy Notes */}
      {isEditingInline ? (
        <div className="space-y-1.5 pt-2">
          <label className="section-title block">
            Strategy Notes
          </label>
          <AutoResizeTextarea
            minRows={3}
            value={strategyNotes}
            onChange={(e) => setStrategyNotes(e.target.value)}
            placeholder="Strategy notes and objectives..."
            className="document-textarea text-[14px] sm:text-[15px]"
          />
        </div>
      ) : (
        strategyNotes ? (
          <div className="space-y-1.5 pt-2">
            <h4 className="section-title">Strategy Notes</h4>
            <p className="text-[14px] sm:text-[15px] text-theme-secondary leading-relaxed max-w-2xl whitespace-pre-wrap">
              {strategyNotes}
            </p>
          </div>
        ) : null
      )}

      {/* Lightbox Pop-up Modal */}
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
        isOpen={Boolean(deleteTargetItem)}
        count={1}
        itemTitle={deleteTargetItem?.title}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetItem(null)}
      />
    </div>
  );
}

function isImageFileName(title: string): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  const exts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"];
  return exts.some((ext) => lower.endsWith(ext)) || lower.startsWith("data:image/");
}
