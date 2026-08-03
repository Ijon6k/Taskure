"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Copy, Download, Check, FileCode, Layers, LayoutGrid } from "lucide-react";
import { ProjectData } from "@/lib/api";
import { ModalContainer } from "@/components/ui/modal-container";
import { toast } from "sonner";
import { buildProjectJSON, ExportScope } from "@/lib/workspace-backup";
import { cn } from "@/lib/utils";

interface ExportJsonModalProps {
  isOpen: boolean;
  project: ProjectData | null;
  onClose: () => void;
}

export function ExportJsonModal({ isOpen, project, onClose }: ExportJsonModalProps) {
  const [scope, setScope] = useState<ExportScope>("project");
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the copied indicator timer whenever the modal closes or unmounts.
  useEffect(() => {
    if (!isOpen && copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const jsonString = useMemo(() => {
    if (!project) return "";
    return JSON.stringify(buildProjectJSON(project, scope), null, 2);
  }, [project, scope]);

  const totalColumns = project?.columns?.length ?? 0;
  const totalTasks =
    project?.columns?.reduce((sum, column) => sum + (column.tasks?.length ?? 0), 0) ?? 0;

  if (!isOpen || !project) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast.success("JSON copied to clipboard!");
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const slug = project.name.toLowerCase().replace(/\s+/g, "-");
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}-${scope}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${scope === "project" ? "full project" : "board only"} JSON.`);
  };

  const lineCount = useMemo(() => jsonString.split("\n").length, [jsonString]);
  const byteSize = useMemo(
    () => (jsonString ? (new Blob([jsonString]).size / 1024).toFixed(1) : "0"),
    [jsonString]
  );

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-[540px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-accent-subtle text-accent flex items-center justify-center shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[20px] font-semibold text-theme-primary tracking-tight leading-none">
              Export JSON
            </h2>
            <p className="text-[12px] text-theme-secondary mt-1">
              {project.name} — portable, no ids included
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-md text-theme-tertiary hover:text-theme-primary hover:bg-surface-l4 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-5 pt-3">
        {/* Scope segmented control */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
            Export scope
          </label>
          <div className="p-1 bg-surface-l4 rounded-md flex gap-1">
            <ScopeButton
              active={scope === "project"}
              onClick={() => setScope("project")}
              icon={<Layers className="w-4 h-4 text-accent shrink-0" />}
              title="Full project"
              description="Metadata + columns & tasks"
            />
            <ScopeButton
              active={scope === "board"}
              onClick={() => setScope("board")}
              icon={<LayoutGrid className="w-4 h-4 text-accent shrink-0" />}
              title="Board only"
              description="Columns & tasks — nothing else"
            />
          </div>
        </div>

        {/* Summary strip */}
        <div className="flex items-center justify-between text-[12px] font-mono text-theme-tertiary px-0.5">
          <span>
            {totalColumns} column{totalColumns === 1 ? "" : "s"} · {totalTasks} task
            {totalTasks === 1 ? "" : "s"}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-accent-subtle text-accent font-sans font-semibold text-[10.5px]">
            {scope === "project" ? "PROJECT" : "BOARD"}
          </span>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[12px] text-theme-secondary font-mono">
            <span>
              PREVIEW ({lineCount} lines · {byteSize} KB)
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-accent hover:underline flex items-center gap-1 font-sans cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-semantic-success" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy raw JSON"}</span>
            </button>
          </div>

          <pre className="p-4 bg-surface-l4 rounded-md max-h-[240px] overflow-y-auto font-mono text-[12px] text-theme-primary leading-relaxed whitespace-pre selection:bg-accent">
            {jsonString}
          </pre>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-[14px] font-medium text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "px-4 py-2.5 bg-surface-l3 hover:bg-surface-l4 text-theme-primary text-[14px] font-medium rounded-md flex items-center gap-2 transition-colors cursor-pointer",
              copied && "text-semantic-success"
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied" : "Copy JSON"}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-on-accent text-[14px] font-semibold rounded-md flex items-center gap-2 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download .json</span>
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}

function ScopeButton({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 py-2 px-3 rounded-md text-left transition-all flex items-center gap-2.5 cursor-pointer",
        active
          ? "bg-surface-l2 text-theme-primary font-semibold shadow-xs"
          : "text-theme-secondary hover:text-theme-primary hover:bg-surface-l3"
      )}
    >
      {icon}
      <div>
        <div className="text-[13px] leading-snug">{title}</div>
        <div className="text-[11px] text-theme-tertiary font-normal">{description}</div>
      </div>
    </button>
  );
}
