"use client";

import { useEffect } from "react";
import { Image as ImageIcon, ExternalLink, X } from "lucide-react";
import { ProjectAsset } from "../types";

interface AssetLightboxModalProps {
  asset: ProjectAsset | null;
  onClose: () => void;
}

export function AssetLightboxModal({
  asset,
  onClose,
}: AssetLightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && asset) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [asset, onClose]);

  if (!asset) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[92vh] w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between py-2.5 px-4 bg-surface-l5 border border-theme-subtle rounded-t-md text-theme-primary">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <ImageIcon className="w-4 h-4 text-brand-accent shrink-0" />
            <span className="text-sm font-semibold truncate">{asset.title}</span>
            <span className="text-[11px] text-theme-tertiary font-mono shrink-0">
              ({asset.source.label})
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={asset.url}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded bg-surface-l3 hover:bg-surface-hover text-theme-secondary hover:text-theme-primary transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Open original image"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open original</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-theme-tertiary hover:text-theme-primary hover:bg-surface-hover transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Photo Canvas */}
        <div className="w-full bg-surface-l0 border-x border-b border-theme-subtle rounded-b-md p-4 flex items-center justify-center overflow-hidden max-h-[82vh]">
          <img
            src={asset.url}
            alt={asset.title}
            className="max-h-[76vh] max-w-full object-contain rounded-md shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
