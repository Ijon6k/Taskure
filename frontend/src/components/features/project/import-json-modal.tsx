"use client";

import { useState } from "react";
import { X, FileCode, Upload, ArrowRight, Clipboard, Sparkles, Trash2, Layers, LayoutGrid } from "lucide-react";
import { useCreateProject, ProjectData } from "@/lib/api";
import { ModalContainer } from "@/components/ui/modal-container";
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
        JSON.parse(text);
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
    <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-[540px]">
      {/* Header — Borderless */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-brand-accent/15 flex items-center justify-center text-brand-accent shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[20px] font-semibold text-theme-primary tracking-tight leading-none">
              Import JSON
            </h2>
            <p className="text-[12px] text-theme-secondary mt-1">
              Import project spec or board layout from JSON
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
        {/* Target Scope Segmented Control */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
            Target Scope
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
                <div className="text-[11px] text-theme-tertiary font-normal">Name, specs & columns</div>
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

        {/* Input Mode Selector Bar (Paste vs Upload) */}
        <div className="flex items-center justify-between pt-1">
          <div className="p-1 bg-surface-l4 rounded-[10px] flex gap-1 text-[13px]">
            <button
              type="button"
              onClick={() => setMode("paste")}
              className={`px-3 py-1 rounded-[6px] font-medium transition-all cursor-pointer ${
                mode === "paste"
                  ? "bg-surface-l2 text-theme-primary shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary"
              }`}
            >
              Paste Code
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`px-3 py-1 rounded-[6px] font-medium transition-all cursor-pointer ${
                mode === "upload"
                  ? "bg-surface-l2 text-theme-primary shadow-xs"
                  : "text-theme-secondary hover:text-theme-primary"
              }`}
            >
              Upload File
            </button>
          </div>

          {/* Quick Toolbar for Paste Mode */}
          {mode === "paste" && (
            <div className="flex items-center gap-2 text-[12px]">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="px-2.5 py-1 rounded-[6px] bg-brand-accent/15 hover:bg-brand-accent/25 text-brand-accent font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste Clipboard</span>
              </button>

              {jsonText && (
                <>
                  <button
                    type="button"
                    onClick={handleFormatJson}
                    className="px-2.5 py-1 rounded-[6px] bg-surface-l4 hover:bg-surface-hover text-theme-secondary hover:text-theme-primary flex items-center gap-1 transition-colors cursor-pointer"
                    title="Prettify JSON"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Format</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setJsonText("");
                      setError(null);
                    }}
                    className="p-1 rounded-[6px] text-theme-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Clear text"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Input & Code Editor Area — Borderless surface */}
        {mode === "paste" ? (
          <div className="space-y-1.5">
            <textarea
              rows={7}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              placeholder={`{\n  "name": "My Project",\n  "description": "JSON spec from ChatGPT / Claude",\n  "columns": [\n    { "name": "Todo", "tasks": [] }\n  ]\n}`}
              className="w-full font-mono text-[12px] bg-surface-l4/80 focus:bg-surface-l4 focus:ring-2 focus:ring-brand-accent/20 rounded-[10px] p-4 text-theme-primary placeholder-theme-tertiary outline-none transition-all resize-none leading-relaxed"
            />
            {jsonText && (
              <div className="text-[11px] font-mono text-theme-tertiary text-right pr-1">
                {lineCount} lines · {byteSize} KB
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 rounded-[10px] text-center bg-surface-l4/60 hover:bg-surface-l4 transition-colors cursor-pointer relative group">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-7 h-7 text-theme-tertiary group-hover:text-brand-accent transition-colors mx-auto mb-2" />
            <div className="text-[14px] font-semibold text-theme-primary">
              {jsonText ? "File loaded into editor" : "Click to select a .json file"}
            </div>
            <div className="text-[12px] text-theme-secondary mt-1">
              Supports standard JSON project or board files
            </div>
          </div>
        )}

        {error && (
          <div className="text-[13px] text-semantic-danger bg-semantic-danger-subtle/30 p-3 rounded-[8px] font-medium">
            {error}
          </div>
        )}

        {/* Actions — Borderless footer */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-[14px] font-medium text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={createProjectMutation.isPending || !jsonText.trim()}
            className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-black text-[14px] font-semibold rounded-[8px] transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <span>{createProjectMutation.isPending ? "Importing..." : "Import JSON"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}
