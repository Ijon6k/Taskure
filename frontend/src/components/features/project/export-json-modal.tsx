"use client";

import { useState, useMemo } from "react";
import { X, Copy, Download, Check, FileCode, Layers, LayoutGrid } from "lucide-react";
import { ProjectData } from "@/lib/api";
import { ModalContainer } from "@/components/ui/modal-container";
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
    <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-[540px]">
      {/* Header — Clean & Borderless */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-brand-accent/15 flex items-center justify-center text-brand-accent shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[20px] font-semibold text-theme-primary tracking-tight leading-none">
              Export JSON
            </h2>
            <p className="text-[12px] text-theme-secondary mt-1">
              Export spec or board data for {project.name}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full text-theme-tertiary hover:text-theme-primary hover:bg-surface-l4 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-5 pt-3">
        {/* Scope Segmented Control */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
            Export Scope
          </label>
          <div className="p-1 bg-surface-l4 rounded-[10px] flex gap-1">
            <button
              type="button"
              onClick={() => setScope("project")}
              className={`flex-1 py-2 px-3 rounded-[8px] text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                scope === "project"
                  ? "bg-surface-l2 text-theme-primary font-semibold shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-l3/50"
              }`}
            >
              <Layers className="w-4 h-4 text-brand-accent shrink-0" />
              <div>
                <div className="text-[13px] leading-snug">Full Project</div>
                <div className="text-[11px] text-theme-tertiary font-normal">Specs, tasks & contexts</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScope("board")}
              className={`flex-1 py-2 px-3 rounded-[8px] text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                scope === "board"
                  ? "bg-surface-l2 text-theme-primary font-semibold shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-surface-l3/50"
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-brand-accent shrink-0" />
              <div>
                <div className="text-[13px] leading-snug">Board Only</div>
                <div className="text-[11px] text-theme-tertiary font-normal">Columns & tasks</div>
              </div>
            </button>
          </div>
        </div>

        {/* Code Preview Container — Borderless surface */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[12px] text-theme-secondary font-mono">
            <span>PREVIEW ({lineCount} lines · {byteSize} KB)</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-brand-accent hover:underline flex items-center gap-1 font-sans cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-semantic-success" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Raw JSON"}</span>
            </button>
          </div>

          {/* Borderless Code preview surface */}
          <div className="p-4 bg-surface-l4/80 rounded-[10px] max-h-[240px] overflow-y-auto font-mono text-[12px] text-theme-primary leading-relaxed whitespace-pre selection:bg-brand-accent/30">
            {jsonString}
          </div>
        </div>

        {/* Actions — Borderless footer */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-[14px] font-medium text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 bg-surface-l3 hover:bg-surface-l4 text-theme-primary text-[14px] font-medium rounded-[8px] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>Copy JSON</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-black text-[14px] font-semibold rounded-[8px] flex items-center gap-2 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download .json</span>
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}
