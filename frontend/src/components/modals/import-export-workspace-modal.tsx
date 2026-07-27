"use client";

import { useState } from "react";
import { Upload, Download, FileText, AlertCircle } from "lucide-react";
import { ModalContainer } from "@/components/ui/modal-container";
import { Button } from "@/components/ui/button";
import { exportFullWorkspaceJSON, importFullWorkspaceJSON } from "@/lib/workspace-backup";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ImportExportWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportExportWorkspaceModal({ isOpen, onClose }: ImportExportWorkspaceModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [jsonText, setJsonText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      await exportFullWorkspaceJSON();
      toast.success("Workspace backup downloaded!");
      onClose();
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      setErrorMsg(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonText.trim()) {
      setErrorMsg("Please paste or upload a JSON backup file.");
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      const result = await importFullWorkspaceJSON(jsonText);
      await queryClient.invalidateQueries();
      toast.success(`Restored ${result.projectCount} projects and ${result.taskCount} tasks!`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid workspace JSON payload.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-[460px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
          <h2 className="text-[17px] font-medium text-theme-primary">Workspace Backup (JSON)</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-theme-tertiary hover:text-theme-primary text-[12px] font-medium transition-colors cursor-pointer"
          >
            Esc
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex bg-surface-l3 p-1 rounded-md">
          <button
            type="button"
            onClick={() => {
              setActiveTab("export");
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all cursor-pointer ${
              activeTab === "export"
                ? "bg-surface-l4 text-theme-primary shadow-xs"
                : "text-theme-tertiary hover:text-theme-secondary"
            }`}
          >
            Export Backup
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("import");
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all cursor-pointer ${
              activeTab === "import"
                ? "bg-surface-l4 text-theme-primary shadow-xs"
                : "text-theme-tertiary hover:text-theme-secondary"
            }`}
          >
            Restore Backup
          </button>
        </div>

        {activeTab === "export" ? (
          <div className="space-y-4 py-1">
            <p className="text-[13px] text-theme-secondary leading-relaxed">
              Export all projects, columns, tasks, checklist items, and workspace tag templates into a portable JSON backup file.
            </p>
            <div className="p-3.5 bg-surface-l3 rounded-md space-y-2 border border-theme-subtle">
              <div className="text-[13px] font-medium text-theme-primary flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-accent" />
                <span>Backup Package Contents</span>
              </div>
              <ul className="text-[12px] text-theme-tertiary space-y-1 list-disc list-inside">
                <li>All Projects & column locations</li>
                <li>Tasks, priorities, due dates & checklist items</li>
                <li>Global workspace tag library & categories</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleExport} className="w-full sm:w-auto rounded-md">
                <Download className="w-4 h-4 mr-2" />
                <span>Download JSON Backup</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <p className="text-[13px] text-theme-secondary leading-relaxed">
              Upload a `.json` backup file or paste raw workspace JSON text to restore your workspace.
            </p>

            {/* File Upload Dropzone Trigger */}
            <div className="relative">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="p-4 border border-dashed border-theme-subtle hover:border-brand-accent/50 rounded-md text-center space-y-1 transition-colors bg-surface-l3/50">
                <Upload className="w-4 h-4 text-brand-accent mx-auto" />
                <div className="text-[13px] font-medium text-theme-primary">
                  Click or drop `.json` backup file here
                </div>
                <div className="text-[11px] text-theme-tertiary">Max file size 10MB</div>
              </div>
            </div>

            {/* JSON Textarea */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-theme-tertiary uppercase">
                Or paste JSON content
              </label>
              <textarea
                rows={4}
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder='{"version": 1, "projects": [...]}'
                className="w-full bg-surface-l3 border border-theme-subtle rounded-md p-3 text-[12px] font-mono text-theme-primary placeholder-theme-tertiary outline-none focus:border-brand-accent transition-colors resize-none"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-[13px] text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose} className="rounded-md">
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isImporting || !jsonText.trim()} className="rounded-md">
                {isImporting ? "Restoring..." : "Restore Workspace"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ModalContainer>
  );
}
