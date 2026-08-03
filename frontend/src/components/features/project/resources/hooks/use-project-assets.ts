"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProjectAssetItem, ProjectAssetsData, ResourceLinkItem, api } from "@/lib/api";
import { normalizeStorageUrl } from "@/lib/image-url";
import { ProjectAsset, GroupByOption, AssetGroup, AssetKind } from "../types";
import { UploadQueueItem } from "../components/upload-queue-card";
import { toast } from "sonner";

/** React Query key for the assets query of a project. */
export const projectAssetsKey = (projectId: string) => ["project", "assets", projectId];

/** Maps a raw asset row into the display shape, deriving kind from mime/filename when missing. */
function mapAssetItem(item: ProjectAssetItem): ProjectAsset {
  // Task attachments are stored with type "file" even for images (backend
  // serializes AttachmentItem.Type as "file" on upload), so image detection
  // falls back to mime/filename heuristics — same rule the pre-endpoint
  // Asset Explorer used on the board payload.
  const looksLikeImage =
    item.mime_type?.startsWith("image/") || isImageFileName(item.title);
  const kind: AssetKind = looksLikeImage
    ? "image"
    : item.kind === "link" || item.url?.startsWith("http")
      ? "link"
      : "file";

  return {
    id: item.id,
    title: item.title || "Resource",
    url: normalizeStorageUrl(item.url || ""),
    previewUrl: item.preview_url ? normalizeStorageUrl(item.preview_url) : undefined,
    kind,
    size: item.size,
    mimeType: item.mime_type,
    createdAt: item.created_at,
    source:
      item.source_kind === "task"
        ? { kind: "task" as const, label: `Task: ${item.source_label}`, taskId: item.task_id }
        : { kind: "overview" as const, label: "Project Overview" },
  };
}

/** Resource management for a project: paginated asset list, search, upload/link/delete/bulk and optimistic cache updates. */
export function useProjectAssets(projectId: string, onRefreshProject?: () => void) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("source");
  const [viewKindFilter, setViewKindFilter] = useState<"all" | AssetKind>("all");
  const [isUploading, setIsUploading] = useState(false);

  // Live Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

  // Temporary Selection State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Lightbox Inspection State
  const [previewAsset, setPreviewAsset] = useState<ProjectAsset | null>(null);

  const { data, refetch } = useQuery({
    queryKey: projectAssetsKey(projectId),
    queryFn: () => api.getProjectAssets(projectId),
    enabled: Boolean(projectId),
  });

  // Clipboard Image Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type && item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return;

      e.preventDefault();
      await uploadFiles(imageFiles as unknown as FileList);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [projectId]);

  // 1. Overview Direct Assets
  const overviewAssets = useMemo<ProjectAsset[]>(() => {
    return (data?.resources ?? []).map(mapAssetItem);
  }, [data?.resources]);

  // 2. Task Attachments
  const taskAssets = useMemo<ProjectAsset[]>(() => {
    return (data?.attachments ?? []).map(mapAssetItem);
  }, [data?.attachments]);

  // 3. Combined Assets Array (overview resources win over attachments
  // sharing an id or URL, matching the pre-endpoint dedup rule)
  const allAssets = useMemo<ProjectAsset[]>(() => {
    const map = new Map<string, ProjectAsset>();

    overviewAssets.forEach((asset) => {
      map.set(asset.id || asset.url, asset);
    });

    taskAssets.forEach((asset) => {
      if (asset.url && !map.has(asset.url) && !map.has(asset.id)) {
        map.set(asset.id, asset);
      }
    });

    return Array.from(map.values());
  }, [overviewAssets, taskAssets]);

  // 4. Search & Filtered Assets
  const filteredAssets = useMemo(() => {
    return allAssets.filter((asset) => {
      const matchesSearch =
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.source.label.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (viewKindFilter !== "all" && asset.kind !== viewKindFilter) return false;
      return true;
    });
  }, [allAssets, searchQuery, viewKindFilter]);

  // 5. Grouped Assets
  const assetGroups = useMemo<AssetGroup[]>(() => {
    if (groupBy === "source") {
      const groupsMap = new Map<string, ProjectAsset[]>();

      filteredAssets.forEach((asset) => {
        const key = asset.source.label;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, []);
        }
        groupsMap.get(key)!.push(asset);
      });

      return Array.from(groupsMap.entries()).map(([title, assets]) => ({
        id: `group-${title.toLowerCase().replace(/\s+/g, "-")}`,
        title,
        assets,
      }));
    } else {
      // Group by Kind
      const photos = filteredAssets.filter((a) => a.kind === "image");
      const files = filteredAssets.filter((a) => a.kind === "file");
      const links = filteredAssets.filter((a) => a.kind === "link");

      const res: AssetGroup[] = [];
      if (photos.length > 0) res.push({ id: "group-photos", title: "Photos & Images", assets: photos });
      if (files.length > 0) res.push({ id: "group-files", title: "Documents & Files", assets: files });
      if (links.length > 0) res.push({ id: "group-links", title: "Links & References", assets: links });
      return res;
    }
  }, [filteredAssets, groupBy]);

  // API Persistence for Links
  const saveOverviewResources = async (newList: ResourceLinkItem[]) => {
    try {
      await api.updateProject(projectId, { resources: newList });
      await refetch();
      if (onRefreshProject) onRefreshProject();
    } catch (err) {
      toast.error("Failed to update resources: " + (err as Error).message);
      throw err;
    }
  };

  const addLinkAsset = async (url: string, title?: string) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }

    const cleanTitle = title?.trim() || cleanUrl;
    const isImg = isImageFileName(cleanTitle) || cleanUrl.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);
    const kind: AssetKind = isImg ? "image" : "link";

    const newItem: ResourceLinkItem = {
      id: "res-" + Date.now(),
      title: cleanTitle,
      url: cleanUrl,
      type: kind,
      created_at: new Date().toISOString(),
    };

    const currentRaw = (data?.resources ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url || "",
      type: r.kind as ResourceLinkItem["type"],
      preview_url: r.preview_url,
      size: r.size,
      mime_type: r.mime_type,
      created_at: r.created_at,
    }));
    await saveOverviewResources([newItem, ...currentRaw]);
    toast.success("Asset link added!");
  };

  // Binary Direct MinIO Upload — Preserves Original File Untouched
  const uploadFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0 || !projectId) return;
    setIsUploading(true);

    const filesArray = Array.from(fileList);
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
      const isImg = file.type.startsWith("image/");

      // Local preview DataURL for immediate queue thumbnail
      let previewUrl: string | undefined = undefined;
      if (isImg) {
        try {
          previewUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        } catch {
          // ignore error
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
        await api.uploadProjectResource(projectId, file);
        successCount++;

        if (queueId) {
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === queueId ? { ...q, progress: 100 } : q))
          );
        }

        // Seamless transition out
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

    await refetch();
    if (onRefreshProject) onRefreshProject();
    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} ${filesArray.length === 1 ? "file" : "files"} saved to MinIO storage!`);
    }
  };

  const dismissQueueItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const deleteAsset = async (asset: ProjectAsset) => {
    try {
      if (asset.source.kind === "task" && asset.source.taskId) {
        await api.deleteTaskAttachment(asset.source.taskId, asset.id);
      } else {
        await api.deleteProjectResource(projectId, asset.id);
      }
      await refetch();
      if (onRefreshProject) onRefreshProject();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
      toast.success("Asset removed");
    } catch (err) {
      toast.error("Failed to remove asset: " + (err as Error).message);
    }
  };

  const editAsset = async (id: string, newTitle: string, newUrl?: string) => {
    const currentRaw = (data?.resources ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url || "",
      type: r.kind as ResourceLinkItem["type"],
      preview_url: r.preview_url,
      size: r.size,
      mime_type: r.mime_type,
      created_at: r.created_at,
    }));
    const updated = currentRaw.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          title: newTitle.trim() || r.title,
          url: newUrl?.trim() || r.url,
        };
      }
      return r;
    });
    await saveOverviewResources(updated);
    toast.success("Asset updated");
  };

  const bulkDeleteAssets = async (assets: ProjectAsset[]) => {
    if (assets.length === 0) return;
    try {
      // Sequential — backend DeleteResource does a read-modify-write on
      // settings.resources; concurrent calls would overwrite each other.
      for (const asset of assets) {
        if (asset.source.kind === "task" && asset.source.taskId) {
          await api.deleteTaskAttachment(asset.source.taskId, asset.id);
        } else {
          await api.deleteProjectResource(projectId, asset.id);
        }
      }
      await refetch();
      if (onRefreshProject) onRefreshProject();
      setSelectedIds(new Set());
      setIsSelecting(false);
      toast.success(`${assets.length} asset(s) removed`);
    } catch (err) {
      toast.error("Failed to remove assets: " + (err as Error).message);
    }
  };

  // Selection Mode Actions
  const toggleSelectionMode = () => {
    setIsSelecting((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredAssets.map((a) => a.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  return {
    searchQuery,
    setSearchQuery,
    groupBy,
    setGroupBy,
    viewKindFilter,
    setViewKindFilter,
    allAssets,
    filteredAssets,
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
  };
}

/** Heuristic: does the filename look like an image (png/jpg/gif/webp/svg)? */
function isImageFileName(title: string): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  const exts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"];
  return exts.some((ext) => lower.endsWith(ext)) || lower.startsWith("data:image/");
}

export type { ProjectAssetsData };
