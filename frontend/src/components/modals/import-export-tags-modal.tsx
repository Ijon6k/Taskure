"use client";

import { useState, useMemo } from "react";
import { X, Copy, Download, Check, FileCode, Upload, ArrowRight, Clipboard, Trash2 } from "lucide-react";
import { exportTagsJson, importTagsJson } from "@/lib/tags";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";

interface ImportExportTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportExportTagsModal({ isOpen, onClose, onSuccess }: ImportExportTagsModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [importText, setImportText] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useHotkeys("esc", () => {
    if (isOpen) onClose();
  }, { enabled: isOpen });

  const exportedJson = useMemo(() => {
    return exportTagsJson();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedJson);
    setCopied(true);
    toast.success("Tag Templates JSON copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportedJson);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "kanban-tag-templates.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Downloaded tag templates JSON!");
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.warning("Clipboard is empty");
        return;
      }
      setImportText(text);
      setError(null);
      toast.success("Pasted JSON from clipboard!");
    } catch {
      toast.error("Failed to read clipboard. Please paste manually.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        JSON.parse(text); // validate
        setImportText(text);
        setError(null);
        toast.success(`File "${file.name}" loaded!`);
      } catch {
        setError("Invalid JSON file. Please check syntax.");
        toast.error("Invalid JSON file syntax.");
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (!importText.trim()) {
      setError("Please paste or upload JSON tag templates.");
      return;
    }

    const res = importTagsJson(importText);
    if (res.success) {
      toast.success(res.message);
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError(res.message);
      toast.error(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-[540px] bg-surface-l5 border border-theme-default rounded-md p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-theme-subtle pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-brand-accent-subtle flex items-center justify-center text-accent">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-medium text-theme-primary tracking-tight">
                Tag Templates JSON
              </h2>
              <p className="text-[12px] text-theme-secondary">
                Backup, export, or import your Global Tag Categories & Templates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] text-theme-secondary hover:text-theme-primary hover:bg-surface-l3 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-theme-subtle pb-2 text-[13px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`px-3 py-1.5 rounded-[6px] transition-colors ${
              activeTab === "export"
                ? "bg-surface-l3 text-theme-primary"
                : "text-theme-secondary hover:text-theme-primary"
            }`}
          >
            Export Tags JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`px-3 py-1.5 rounded-[6px] transition-colors ${
              activeTab === "import"
                ? "bg-surface-l3 text-theme-primary"
                : "text-theme-secondary hover:text-theme-primary"
            }`}
          >
            Import Tags JSON
          </button>
        </div>

        {/* Tab 1: Export */}
        {activeTab === "export" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-theme-secondary font-mono">
              <span>TAG TEMPLATES SPEC</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-brand-accent hover:underline flex items-center gap-1 font-sans"
              >
                {copied ? <Check className="w-3 h-3 text-semantic-success" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy Raw JSON"}</span>
              </button>
            </div>

            <div className="p-3 bg-surface-l0 border border-theme-subtle rounded-[8px] max-h-[220px] overflow-y-auto font-mono text-[12px] text-semantic-success whitespace-pre selection:bg-brand-accent/30">
              {exportedJson}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-theme-subtle">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[8px] text-[13px] font-medium text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 bg-surface-l3 hover:bg-surface-l4 border border-theme-default text-theme-primary text-[13px] font-medium rounded-[8px] flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-black text-[13px] font-medium rounded-[8px] flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .json</span>
              </button>
            </div>
          </div>
        ) : (
          /* Tab 2: Import */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-theme-secondary font-mono">
              <span>PASTE OR UPLOAD TAGS JSON</span>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-brand-accent hover:underline flex items-center gap-1 font-sans"
              >
                <Clipboard className="w-3 h-3" />
                <span>Paste Clipboard</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setError(null);
              }}
              placeholder={`{\n  "_instructions": "Color names: gray, blue, cyan, emerald, green, lime, amber, yellow, orange, coral, red, soft-red, pink, soft-pink, violet, purple, indigo",\n  "categories": [\n    { "id": "cat-activity", "name": "Activity Type" }\n  ],\n  "tags": [\n    { "id": "t-meeting", "name": "Meeting", "color": "purple", "categoryId": "cat-activity" },\n    { "id": "t-urgent", "name": "Urgent", "color": "red" }\n  ]\n}`}
              className="w-full p-3 bg-surface-l0 border border-theme-subtle focus:border-brand-accent rounded-[8px] text-[12px] font-mono text-theme-primary placeholder:text-theme-tertiary outline-none transition-colors resize-none overflow-y-auto"
            />

            <div className="border border-dashed border-theme-default hover:border-theme-strong rounded-[8px] p-3 text-center bg-surface-l2 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex items-center justify-center gap-2 text-[12px] text-theme-secondary">
                <Upload className="w-4 h-4 text-theme-secondary" />
                <span>{importText ? "File loaded into editor" : "Or click to upload .json file"}</span>
              </div>
            </div>

            {error && (
              <div className="text-[12px] text-semantic-danger bg-semantic-danger-subtle p-2 rounded-[6px] border border-semantic-danger/20">
                {error}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-theme-subtle">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[8px] text-[13px] font-medium text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={!importText.trim()}
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-black text-[13px] font-medium rounded-[8px] transition-colors flex items-center gap-1.5 disabled:opacity-40"
              >
                <span>Import Tag Templates</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
