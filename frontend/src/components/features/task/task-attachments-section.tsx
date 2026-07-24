"use client";

import { useState, useRef } from "react";
import { Link2, Upload, Plus, Trash2, ExternalLink, FileText } from "lucide-react";

export interface AttachmentItem {
  id: string;
  type: "link" | "file";
  title: string;
  url?: string;
  size?: string;
}

interface TaskAttachmentsSectionProps {
  attachments?: AttachmentItem[];
  onChange?: (attachments: AttachmentItem[]) => void;
}

export function TaskAttachmentsSection({
  attachments = [],
  onChange,
}: TaskAttachmentsSectionProps) {
  const [linkInput, setLinkInput] = useState("");
  const [linkNameInput, setLinkNameInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: AttachmentItem[] = Array.from(files).map((file) => {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const sizeStr = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${Math.round(file.size / 1024)} KB`;
      return {
        id: "file-" + Date.now() + Math.random().toString(36).substr(2, 4),
        type: "file",
        title: file.name,
        size: sizeStr,
        url: URL.createObjectURL(file),
      };
    });

    const updated = [...attachments, ...newItems];
    if (onChange) onChange(updated);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteAttachment = (id: string) => {
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
        <form onSubmit={handleAddLink} className="p-3 bg-theme-elevated border border-theme-default rounded-[6px] space-y-2.5">
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
              className="w-full bg-theme-surface border border-theme-default rounded-[6px] px-3 py-1.5 text-[13px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent"
              autoFocus
            />
            <input
              type="text"
              value={linkNameInput}
              onChange={(e) => setLinkNameInput(e.target.value)}
              placeholder="Link title (optional, e.g. API Docs)..."
              className="w-full bg-theme-surface border border-theme-default rounded-[6px] px-3 py-1.5 text-[13px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowLinkInput(false)}
              className="px-2.5 py-1 text-[12px] text-theme-secondary hover:text-theme-primary rounded-[4px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!linkInput.trim()}
              className="px-3 py-1 bg-brand-accent hover:opacity-90 text-black font-medium text-[12px] rounded-[6px] disabled:opacity-40 transition-opacity"
            >
              Add Link
            </button>
          </div>
        </form>
      )}

      {/* Input 2: Drop Zone File Upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="p-3.5 bg-theme-elevated hover:bg-theme-hover border border-dashed border-theme-default hover:border-brand-accent rounded-[8px] cursor-pointer transition-colors text-center group space-y-1.5"
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
          <span className="text-[13px] font-medium">Click to upload files or drop here</span>
        </div>
        <p className="text-[11px] text-theme-tertiary">
          Supports images, PDFs, docs, and code files up to 25MB
        </p>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          {attachments.map((item) => (
            <div
              key={item.id}
              className="p-2.5 bg-theme-elevated border border-theme-default rounded-[6px] flex items-center justify-between group hover:border-theme-secondary transition-colors text-[13px]"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                {item.type === "link" ? (
                  <Link2 className="w-4 h-4 text-brand-accent shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-semantic-success shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-theme-primary font-medium truncate leading-tight">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-theme-tertiary truncate">
                    {item.type === "link" ? item.url : item.size || "File"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-theme-secondary hover:text-brand-accent rounded transition-colors"
                    title="Open Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(item.id)}
                  className="p-1 text-theme-secondary hover:text-semantic-danger opacity-0 group-hover:opacity-100 rounded transition-opacity"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
