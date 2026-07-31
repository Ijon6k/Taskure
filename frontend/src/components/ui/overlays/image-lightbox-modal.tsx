"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, ExternalLink, X } from "lucide-react";
import { getOriginalUrl } from "@/lib/image-url";

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl?: string | null | undefined;
  title?: string | null | undefined;
  onClose: () => void;
}

export function ImageLightboxModal({
  isOpen,
  imageUrl,
  title = "Image Preview",
  onClose,
}: ImageLightboxModalProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const usedOriginalFallback = useRef(false);

  // Reset the displayed image whenever a different attachment is opened.
  useEffect(() => {
    usedOriginalFallback.current = false;
    setCurrentSrc(imageUrl || null);
  }, [imageUrl]);

  // ESC key to close image preview
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const displaySrc = currentSrc || imageUrl;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between py-2.5 px-4 bg-surface-l5 border border-theme-default rounded-t-md text-theme-primary">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <ImageIcon className="w-4 h-4 text-brand-accent shrink-0" />
            <span className="text-sm font-medium truncate">{title || "Image Preview"}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={getOriginalUrl(imageUrl)}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md hover:bg-surface-hover text-theme-secondary hover:text-theme-primary transition-colors flex items-center gap-1 text-xs"
              title="Open original image"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open original</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-surface-hover text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
              title="Close preview (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="w-full bg-surface-l1 border-x border-b border-theme-default rounded-b-md p-4 flex items-center justify-center overflow-hidden max-h-[78vh]">
          <img
            src={displaySrc}
            alt={title || "Preview"}
            onError={() => {
              // Variant may still be generating; fall back to the original once.
              if (!usedOriginalFallback.current) {
                usedOriginalFallback.current = true;
                setCurrentSrc(getOriginalUrl(imageUrl));
              }
            }}
            className="max-h-[72vh] max-w-full object-contain rounded-md shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
