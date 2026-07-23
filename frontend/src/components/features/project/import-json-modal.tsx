"use client";

import { useState } from "react";
import { X, FileCode, Upload, ArrowRight, Clipboard, Sparkles, Trash2, Layers, LayoutGrid } from "lucide-react";
import { useCreateProject, ProjectData } from "@/lib/api";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";

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

  useHotkeys("esc", () => {
    if (isOpen) onClose();
  }, { enabled: isOpen });

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-[560px] bg-[#121214] border border-white/10 rounded-[14px] p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#B794F6]/10 flex items-center justify-center text-[#B794F6]">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-medium text-[#F0F0F0] tracking-tight">
                Import JSON
              </h2>
              <p className="text-[12px] text-[#787878]">
                Import full project spec or board layout from external JSON.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] text-[#787878] hover:text-[#F0F0F0] hover:bg-[#1C1C1E] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Import Scope Selector */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-[#787878] uppercase tracking-[0.5px]">
            Target Scope
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope("project")}
              className={`p-3 rounded-[8px] border text-left flex items-center gap-2.5 transition-all ${
                scope === "project"
                  ? "bg-[#18181A] border-[#7F9CF5] text-[#F0F0F0]"
                  : "bg-[#141416] border-white/6 text-[#787878] hover:text-[#F0F0F0]"
              }`}
            >
              <Layers className="w-4 h-4 text-[#7F9CF5]" />
              <div className="space-y-0.5">
                <div className="text-[13px] font-medium">Full Project</div>
                <div className="text-[10px] text-[#787878]">Name, specs & columns</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScope("board")}
              className={`p-3 rounded-[8px] border text-left flex items-center gap-2.5 transition-all ${
                scope === "board"
                  ? "bg-[#18181A] border-[#7F9CF5] text-[#F0F0F0]"
                  : "bg-[#141416] border-white/6 text-[#787878] hover:text-[#F0F0F0]"
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-[#B794F6]" />
              <div className="space-y-0.5">
                <div className="text-[13px] font-medium">Kanban Board Only</div>
                <div className="text-[10px] text-[#787878]">Columns & tasks</div>
              </div>
            </button>
          </div>
        </div>

        {/* Input Mode Selector (Paste vs Upload) */}
        <div className="flex items-center justify-between border-b border-white/6 pb-2">
          <div className="flex items-center gap-2 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setMode("paste")}
              className={`px-3 py-1 rounded-[6px] transition-colors ${
                mode === "paste"
                  ? "bg-[#1C1C1E] text-[#F0F0F0]"
                  : "text-[#787878] hover:text-[#F0F0F0]"
              }`}
            >
              Paste Code
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`px-3 py-1 rounded-[6px] transition-colors ${
                mode === "upload"
                  ? "bg-[#1C1C1E] text-[#F0F0F0]"
                  : "text-[#787878] hover:text-[#F0F0F0]"
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
                className="px-2 py-1 rounded-[5px] bg-[#7F9CF5]/10 hover:bg-[#7F9CF5]/20 text-[#7F9CF5] font-medium flex items-center gap-1 transition-colors"
              >
                <Clipboard className="w-3 h-3" />
                <span>Paste Clipboard</span>
              </button>

              {jsonText && (
                <>
                  <button
                    type="button"
                    onClick={handleFormatJson}
                    className="px-2 py-1 rounded-[5px] bg-white/5 hover:bg-white/10 text-[#787878] hover:text-[#F0F0F0] flex items-center gap-1 transition-colors"
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
                    className="p-1 rounded text-[#787878] hover:text-red-400 transition-colors"
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
            <div className="relative">
              <textarea
                rows={7}
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setError(null);
                }}
                placeholder={`{\n  "name": "My Project",\n  "description": "JSON spec from ChatGPT / Claude",\n  "columns": [\n    { "name": "Todo", "tasks": [] }\n  ]\n}`}
                className="w-full p-3 bg-[#0A0A0C] border border-white/8 focus:border-[#7F9CF5] rounded-[8px] text-[12px] font-mono text-[#F0F0F0] placeholder-[#444] outline-none transition-colors resize-none overflow-y-auto"
              />
            </div>
            {jsonText && (
              <div className="text-[11px] font-mono text-[#787878] text-right">
                {lineCount} lines • {byteSize} KB
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-[10px] p-6 text-center bg-[#0A0A0C] transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-6 h-6 text-[#787878] mx-auto mb-2" />
            <div className="text-[13px] font-medium text-[#F0F0F0]">
              {jsonText ? "File loaded into editor" : "Click to select a .json file"}
            </div>
            <div className="text-[11px] text-[#787878] mt-1">Supports standard JSON project or board files</div>
          </div>
        )}

        {error && (
          <div className="text-[12px] text-red-400 bg-red-500/10 p-2.5 rounded-[6px] border border-red-500/20">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-[13px] font-medium text-[#787878] hover:text-[#F0F0F0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={createProjectMutation.isPending || !jsonText.trim()}
            className="px-4 py-2 bg-[#7F9CF5] hover:bg-[#6b89e3] text-black text-[13px] font-medium rounded-[8px] transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <span>{createProjectMutation.isPending ? "Importing..." : "Import JSON"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
