"use client";

import { useState, useRef, useEffect } from "react";
import { Link2, Upload, Plus, Trash2, ExternalLink, FileText, Image as ImageIcon, Eye, X } from "lucide-react";
import { toast } from "sonner";

export interface AttachmentItem {
  id: string;
  type: "link" | "file";
  title: string;
  url?: string | undefined;
  size?: string | undefined;
  mimeType?: string | undefined;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB limit for MinIO S3 uploads

function isImageAttachment(item: AttachmentItem & { mime_type?: string }): boolean {
  if (!item.url) return false;
  const mime = item.mimeType || item.mime_type;
  if (mime?.startsWith("image/")) return true;
  const lowerTitle = item.title.toLowerCase();
  const lowerUrl = item.url.toLowerCase();
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"];
  return (
    imageExtensions.some((ext) => lowerTitle.endsWith(ext) || lowerUrl.endsWith(ext)) ||
    lowerUrl.startsWith("data:image/")
  );
}

interface TaskAttachmentsSectionProps {
  attachments?: AttachmentItem[];
  onChange?: (attachments: AttachmentItem[]) => void;
  onUploadFile?: (file: File) => Promise<void>;
  onDeleteFile?: (attachmentId: string) => Promise<void>;
}

export function TaskAttachmentsSection({
  attachments = [],
  onChange,
  onUploadFile,
  onDeleteFile,
}: TaskAttachmentsSectionProps) {
  const [linkInput, setLinkInput] = useState("");
  const [linkNameInput, setLinkNameInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ESC key to close image preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewImage) {
        setPreviewImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImage]);

  const handleAddLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!linkInput.trim()) return;

    let url = linkInput.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const title = linkNameInput.trim() || linkInput.trim();
    const newAttachment: AttachmentItem = {
      id: "att-" + Date.now() + Math.random().toString(36).substr(2, 4),
      type: "link",
      title,
      url,
    };

    const updated = [...attachments, newAttachment];
    if (onChange) onChange(updated);

    setLinkInput("");
    setLinkNameInput("");
    setShowLinkInput(false);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    if (onUploadFile) {
      setIsUploading(true);
      try {
        for (const file of fileArray) {
          if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`File "${file.name}" exceeds 25MB max attachment limit.`);
            continue;
          }
          await onUploadFile(file);
        }
      } catch (err) {
        toast.error("Failed to upload file to MinIO: " + (err as Error).message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (onDeleteFile) {
      try {
        await onDeleteFile(id);
      } catch (err) {
        toast.error("Failed to delete attachment: " + (err as Error).message);
      }
      return;
    }
    const updated = attachments.filter((item) => item.id !== id);
    if (onChange) onChange(updated);
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
          Attachments ({attachments.length})
        </div>
        <button
          type="button"
          onClick={() => setShowLinkInput(!showLinkInput)}
          className="text-[12px] font-medium text-brand-accent hover:underline flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Link</span>
        </button>
      </div>

      {/* Input 1: Insert Link Form */}
      {showLinkInput && (
        <form onSubmit={handleAddLink} className="p-3 bg-theme-elevated border border-theme-default rounded-md space-y-2.5">
          <div className="text-[12px] font-medium text-theme-primary flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-brand-accent" />
            <span>Insert Link Reference</span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="Paste URL (e.g. https://github.com/org/repo)..."
              className="w-full bg-theme-surface border border-theme-default rounded-md px-3 py-1.5 text-[13px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent"
              autoFocus
            />
            <input
              type="text"
              value={linkNameInput}
              onChange={(e) => setLinkNameInput(e.target.value)}
              placeholder="Link title (optional, e.g. API Docs)..."
              className="w-full bg-theme-surface border border-theme-default rounded-md px-3 py-1.5 text-[13px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowLinkInput(false)}
              className="px-2.5 py-1 text-[12px] text-theme-secondary hover:text-theme-primary rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!linkInput.trim()}
              className="px-3 py-1 bg-brand-accent hover:opacity-90 text-black font-medium text-[12px] rounded-md disabled:opacity-40 transition-opacity"
            >
              Add Link
            </button>
          </div>
        </form>
      )}

      {/* Input 2: Drop Zone File Upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="p-3.5 bg-theme-elevated hover:bg-theme-hover border border-dashed border-theme-default hover:border-brand-accent rounded-md cursor-pointer transition-colors text-center group space-y-1.5"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          multiple
          className="hidden"
        />
        <div className="flex items-center justify-center gap-2 text-theme-secondary group-hover:text-brand-accent transition-colors">
          <Upload className="w-4 h-4" />
          <span className="text-[13px] font-medium">Click to upload files, drop, or paste (Ctrl+V)</span>
        </div>
        <p className="text-[11px] text-theme-tertiary">
          Supports clipboard image paste (Ctrl+V), PNG, JPG, WebP, PDFs, docs up to 25MB
        </p>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          {attachments.map((item) => {
            const hasImage = isImageAttachment(item);

            return (
              <div
                key={item.id}
                className="p-2.5 bg-theme-elevated border border-theme-default rounded-md flex items-center justify-between group hover:border-theme-secondary transition-colors text-[13px]"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {hasImage && item.url ? (
                    <div
                      onClick={() => setPreviewImage({ url: item.url!, title: item.title })}
                      className="w-10 h-10 rounded-md overflow-hidden bg-surface-l1 border border-theme-subtle shrink-0 cursor-pointer relative group/thumb shadow-xs"
                      title="Click to expand image preview"
                    >
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover/thumb:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  ) : item.type === "link" ? (
                    <div className="w-9 h-9 rounded-md bg-brand-accent-subtle flex items-center justify-center shrink-0">
                      <Link2 className="w-4 h-4 text-brand-accent" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-semantic-success-subtle flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-semantic-success" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div
                      className={`text-theme-primary font-medium truncate leading-tight ${
                        hasImage ? "cursor-pointer hover:text-brand-accent transition-colors" : ""
                      }`}
                      onClick={() => {
                        if (hasImage && item.url) {
                          setPreviewImage({ url: item.url, title: item.title });
                        }
                      }}
                    >
                      {item.title}
                    </div>
                    <div className="text-[11px] text-theme-tertiary truncate mt-0.5">
                      {hasImage
                        ? `Image • ${item.size || "Preview available"}`
                        : item.type === "link"
                        ? item.url
                        : item.size || "File"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {hasImage && item.url && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: item.url!, title: item.title })}
                      className="p-1.5 text-theme-secondary hover:text-brand-accent hover:bg-surface-hover rounded-md transition-colors"
                      title="Preview image"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {item.url && (
                    <a
                      href={item.url}
                      target={item.url.startsWith("data:") ? "_self" : "_blank"}
                      download={item.url.startsWith("data:") ? item.title : undefined}
                      rel="noreferrer"
                      className="p-1.5 text-theme-secondary hover:text-brand-accent hover:bg-surface-hover rounded-md transition-colors"
                      title={item.url.startsWith("data:") ? "Download file" : "Open link in new tab"}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(item.id)}
                    className="p-1.5 text-theme-secondary hover:text-semantic-danger hover:bg-semantic-danger-subtle opacity-100 sm:opacity-0 group-hover:opacity-100 rounded-md transition-all"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Lightbox Pop-up Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header Bar */}
            <div className="w-full flex items-center justify-between py-2.5 px-4 bg-surface-l5 border border-theme-default rounded-t-md text-theme-primary">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <ImageIcon className="w-4 h-4 text-brand-accent shrink-0" />
                <span className="text-sm font-medium truncate">{previewImage.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={previewImage.url}
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
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-md hover:bg-surface-hover text-theme-secondary hover:text-theme-primary transition-colors"
                  title="Close preview (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="w-full bg-surface-l1 border-x border-b border-theme-default rounded-b-md p-4 flex items-center justify-center overflow-hidden max-h-[78vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[72vh] max-w-full object-contain rounded-md shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

