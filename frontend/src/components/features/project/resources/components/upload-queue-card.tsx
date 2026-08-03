"use client";

import { Loader2, X, RefreshCw } from "lucide-react";

export interface UploadQueueItem {
  id: string;
  title: string;
  progress: number; // 0 to 100
  status: "uploading" | "persisting" | "error";
  error?: string | undefined;
  previewUrl?: string | undefined;
}

interface UploadQueueCardProps {
  item: UploadQueueItem;
  onDismiss?: ((id: string) => void) | undefined;
  onRetry?: ((id: string) => void) | undefined;
}

export function UploadQueueCard({
  item,
  onDismiss,
  onRetry,
}: UploadQueueCardProps) {
  const isError = item.status === "error";

  return (
    <div
      className={`group relative flex flex-col rounded-md overflow-hidden bg-surface-l2 border transition-colors select-none ${
        isError
          ? "border-semantic-danger/40 bg-surface-l2"
          : "border-theme-subtle/80 hover:border-theme-subtle"
      }`}
    >
      {/* 1. Ultra-thin Top Edge Progress Line */}
      {!isError && (
        <div className="w-full h-[2px] bg-surface-l3 overflow-hidden">
          <div
            className="h-full bg-brand-accent transition-all duration-200"
            style={{ width: `${Math.max(5, item.progress)}%` }}
          />
        </div>
      )}

      {/* 2. Canvas Thumbnail or Theme-Matched Placeholder */}
      <div className="relative aspect-[4/3] w-full bg-surface-l2 flex flex-col items-center justify-center p-3 overflow-hidden">
        {item.previewUrl ? (
          <img
            src={item.previewUrl}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-40 filter blur-[2px]"
          />
        ) : null}

        {/* Quiet Overlay State (Theme Tokenized) */}
        <div className="absolute inset-0 bg-surface-l2/85 backdrop-blur-2xs flex flex-col items-center justify-center gap-2 p-3 text-center">
          {isError ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[12px] font-medium text-semantic-danger">
                Upload Failed
              </span>
              <span className="text-[11px] text-theme-tertiary truncate max-w-[140px]" title={item.error}>
                {item.error || "Network error"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin text-theme-secondary" />
              <span className="text-[11.5px] font-mono text-theme-tertiary">
                {item.status === "persisting" ? "Saving..." : `${Math.round(item.progress)}%`}
              </span>
            </div>
          )}
        </div>

        {/* Dismiss / Retry Actions */}
        <div className="absolute top-2 right-2 z-10 opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          {isError && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              className="p-1 bg-surface-l3 hover:bg-surface-hover text-theme-secondary hover:text-theme-primary rounded-md cursor-pointer border border-theme-subtle/50 transition-colors"
              title="Retry upload"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="p-1 bg-surface-l3 hover:bg-surface-hover text-theme-secondary hover:text-theme-primary rounded-md cursor-pointer border border-theme-subtle/50 transition-colors"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Label & Details */}
      <div className="py-2 px-3 space-y-0.5 border-t border-theme-subtle/40 bg-surface-l1">
        <p className="text-[12.5px] font-medium text-theme-secondary truncate leading-tight" title={item.title}>
          {item.title}
        </p>
        <p className="text-[11px] text-theme-tertiary truncate">
          {isError ? "Request failed" : item.status === "persisting" ? "Storing in MinIO..." : "Uploading..."}
        </p>
      </div>
    </div>
  );
}
