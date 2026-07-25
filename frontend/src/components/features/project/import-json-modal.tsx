"use client";

import { useState } from "react";
import { X, FileCode, Upload, ArrowRight, Clipboard, Sparkles, Trash2, Layers, LayoutGrid } from "lucide-react";
import { useCreateProject, ProjectData } from "@/lib/api";
import { ModalContainer } from "@/components/ui/modal-container";
import { FormTextarea } from "@/components/ui/form-input";
import { toast } from "sonner";

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (created: ProjectData) => void;
}

export function ImportJsonModal({ isOpen, onClose, onSuccess }: ImportJsonModalProps) {
  const [scope, setScope] = useState<"project" | "board">("project");
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createProjectMutation = useCreateProject();

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.warning("Clipboard is empty");
        return;
      }
      setJsonText(text);
      setError(null);
      toast.success("Pasted JSON from clipboard!");
    } catch {
      toast.error("Failed to read clipboard. Please paste manually.");
    }
  };

  const handleFormatJson = () => {
    if (!jsonText.trim()) return;
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setError(null);
      toast.success("JSON formatted successfully!");
    } catch {
      setError("Invalid JSON syntax. Cannot format.");
      toast.error("Invalid JSON syntax.");
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
        setJsonText(text);
        setError(null);
        toast.success(`File "${file.name}" loaded successfully!`);
      } catch {
        setError("Invalid JSON file syntax. Please ensure the file is valid JSON.");
        toast.error("Invalid JSON file syntax.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!jsonText.trim()) {
      setError("Please paste JSON content or upload a JSON file.");
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const projectName = parsed.name || parsed.title || "Imported Board";
      const projectDesc = parsed.description || "Board imported from JSON";

      createProjectMutation.mutate(
        {
          name: projectName,
          description: projectDesc,
          color: parsed.color || "#B794F6",
          icon: parsed.icon || "📥",
        },
        {
          onSuccess: (created) => {
            toast.success(`Project "${created.name}" imported successfully!`);
            setJsonText("");
            setError(null);
            if (onSuccess) onSuccess(created);
            onClose();
          },
          onError: (err) => {
            const msg = (err as Error).message || "Failed to import board.";
            setError(msg);
            toast.error(msg);
          },
        }
      );
    } catch {
      setError("Invalid JSON syntax. Please check your JSON structure.");
      toast.error("Invalid JSON syntax.");
    }
  };

  const lineCount = jsonText.split("\n").length;
  const byteSize = jsonText ? (new Blob([jsonText]).size / 1024).toFixed(1) : "0";

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-[560px]">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-theme-subtle pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-brand-accent-subtle flex items-center justify-center text-accent">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[18px] font-medium text-theme-primary tracking-tight">
              Import JSON
            </h2>
            <p className="text-[12px] text-theme-secondary">
              Import full project spec or board layout from external JSON.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-surface-l3 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Import Scope Selector */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
          Target Scope
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScope("project")}
            className={`p-3 rounded-md border text-left flex items-center gap-2.5 transition-all ${
              scope === "project"
                ? "bg-surface-l4 border-brand-accent text-theme-primary"
                : "bg-surface-l4 border-theme-subtle text-theme-secondary hover:text-theme-primary"
            }`}
          >
            <Layers className="w-4 h-4 text-brand-accent" />
            <div className="space-y-0.5">
              <div className="text-[13px] font-medium">Full Project</div>
              <div className="text-[10px] text-theme-secondary">Name, specs & columns</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setScope("board")}
            className={`p-3 rounded-md border text-left flex items-center gap-2.5 transition-all ${
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

      {/* Input Mode Selector (Paste vs Upload) */}
      <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
        <div className="flex items-center gap-2 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setMode("paste")}
            className={`px-3 py-1 rounded-md transition-colors ${
              mode === "paste"
                ? "bg-surface-l3 text-theme-primary"
                : "text-theme-secondary hover:text-theme-primary"
            }`}
          >
            Paste Code
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-3 py-1 rounded-md transition-colors ${
              mode === "upload"
                ? "bg-surface-l3 text-theme-primary"
                : "text-theme-secondary hover:text-theme-primary"
            }`}
          >
            Upload File
          </button>
        </div>

        {/* Quick Toolbar for Paste Mode */}
        {mode === "paste" && (
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="px-2 py-1 rounded-md bg-brand-accent-subtle hover:bg-brand-accent/20 text-brand-accent font-medium flex items-center gap-1 transition-colors"
            >
              <Clipboard className="w-3 h-3" />
              <span>Paste Clipboard</span>
            </button>

            {jsonText && (
              <>
                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="px-2 py-1 rounded-md bg-theme-subtle/50 hover:bg-theme-subtle text-theme-secondary hover:text-theme-primary flex items-center gap-1 transition-colors"
                  title="Prettify JSON"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Format</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJsonText("");
                    setError(null);
                  }}
                  className="p-1 rounded text-theme-secondary hover:text-semantic-danger transition-colors"
                  title="Clear text"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Input & Code Editor Area */}
      {mode === "paste" ? (
        <div className="space-y-1.5">
          <FormTextarea
            rows={7}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            placeholder={`{\n  "name": "My Project",\n  "description": "JSON spec from ChatGPT / Claude",\n  "columns": [\n    { "name": "Todo", "tasks": [] }\n  ]\n}`}
            className="font-mono text-[12px] bg-surface-l2 p-3 overflow-y-auto"
          />
          {jsonText && (
            <div className="text-[11px] font-mono text-theme-secondary text-right">
              {lineCount} lines • {byteSize} KB
            </div>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-theme-default hover:border-theme-strong rounded-md p-6 text-center bg-surface-l2 transition-colors cursor-pointer relative">
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Upload className="w-6 h-6 text-theme-secondary mx-auto mb-2" />
          <div className="text-[13px] font-medium text-theme-primary">
            {jsonText ? "File loaded into editor" : "Click to select a .json file"}
          </div>
          <div className="text-[11px] text-theme-secondary mt-1">Supports standard JSON project or board files</div>
        </div>
      )}

      {error && (
        <div className="text-[12px] text-semantic-danger bg-semantic-danger-subtle p-2.5 rounded-md border border-semantic-danger/20">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-theme-subtle">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-md text-[13px] font-medium text-theme-secondary hover:text-theme-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={createProjectMutation.isPending || !jsonText.trim()}
          className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-black text-[13px] font-medium rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-40"
        >
          <span>{createProjectMutation.isPending ? "Importing..." : "Import JSON"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </ModalContainer>
  );
}
