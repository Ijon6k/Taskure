"use client";

import { useState, useMemo } from "react";
import { X, Copy, Download, Check, FileCode, Layers, LayoutGrid } from "lucide-react";
import { ProjectData } from "@/lib/api";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";

interface ExportJsonModalProps {
  isOpen: boolean;
  project: ProjectData | null;
  onClose: () => void;
}

export function ExportJsonModal({ isOpen, project, onClose }: ExportJsonModalProps) {
  const [scope, setScope] = useState<"project" | "board">("project");
  const [copied, setCopied] = useState(false);

  useHotkeys("esc", () => {
    if (isOpen) onClose();
  }, { enabled: isOpen });

  const exportData = useMemo(() => {
    if (!project) return {};

    if (scope === "board") {
      return {
        id: project.id,
        name: project.name,
        columns: project.columns || [],
      };
    }

    // Full Project Spec
    return {
      id: project.id,
      name: project.name,
      description: project.description || "",
      color: project.color || "#7F9CF5",
      icon: project.icon || "⚡",
      status: project.status || "active",
      columns: project.columns || [],
      contexts: project.contexts || [],
    };
  }, [project, scope]);

  const jsonString = useMemo(() => {
    return JSON.stringify(exportData, null, 2);
  }, [exportData]);

  if (!isOpen || !project) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast.success("JSON copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `${project.name.toLowerCase().replace(/\s+/g, "-")}-${scope}-export.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Downloaded ${scope === "project" ? "Full Project" : "Board Only"} JSON!`);
  };

  const lineCount = jsonString.split("\n").length;
  const byteSize = (new Blob([jsonString]).size / 1024).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-[560px] bg-surface-l5 border border-theme-default rounded-[14px] p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-theme-subtle pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-brand-accent-subtle flex items-center justify-center text-brand-accent">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-medium text-theme-primary tracking-tight">
                Export JSON
              </h2>
              <p className="text-[12px] text-theme-secondary">
                Export project spec or board layout to JSON format.
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

        {/* Scope Selector Tabs */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
            Export Scope
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope("project")}
              className={`p-3 rounded-[8px] border text-left flex items-center gap-2.5 transition-all ${
                scope === "project"
                  ? "bg-surface-l4 border-brand-accent text-theme-primary"
                  : "bg-surface-l4 border-theme-subtle text-theme-secondary hover:text-theme-primary"
              }`}
            >
              <Layers className="w-4 h-4 text-brand-accent" />
              <div className="space-y-0.5">
                <div className="text-[13px] font-medium">Full Project</div>
                <div className="text-[10px] text-theme-secondary">All specs & contexts</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScope("board")}
              className={`p-3 rounded-[8px] border text-left flex items-center gap-2.5 transition-all ${
                scope === "board"
                  ? "bg-surface-l4 border-brand-accent text-theme-primary"
                  : "bg-surface-l4 border-theme-subtle text-theme-secondary hover:text-theme-primary"
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-accent" />
              <div className="space-y-0.5">
                <div className="text-[13px] font-medium">Kanban Board Only</div>
                <div className="text-[10px] text-theme-secondary">Columns & tasks</div>
              </div>
            </button>
          </div>
        </div>

        {/* Code Preview Container */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-theme-secondary font-mono">
            <span>PREVIEW ({lineCount} lines • {byteSize} KB)</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-brand-accent hover:underline flex items-center gap-1 font-sans"
            >
              {copied ? <Check className="w-3 h-3 text-semantic-success" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy Raw JSON"}</span>
            </button>
          </div>

          {/* Code preview area */}
          <div className="p-3 bg-surface-l0 border border-theme-subtle rounded-[8px] max-h-[220px] overflow-y-auto font-mono text-[12px] text-semantic-success whitespace-pre selection:bg-brand-accent/30">
            {jsonString}
          </div>
        </div>

        {/* Actions */}
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
    </div>
  );
}
