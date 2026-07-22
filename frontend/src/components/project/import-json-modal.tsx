"use client";

import { useState } from "react";
import { X, FileCode, Upload, ArrowRight, Check } from "lucide-react";
import { useCreateProject, ProjectData } from "@/lib/api";

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (created: ProjectData) => void;
}

export function ImportJsonModal({ isOpen, onClose, onSuccess }: ImportJsonModalProps) {
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createProjectMutation = useCreateProject();

  if (!isOpen) return null;

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
      } catch (err) {
        setError("File JSON tidak valid. Pastikan format sintaks benar.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!jsonText.trim()) {
      setError("Masukkan teks JSON atau upload file JSON.");
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
            setJsonText("");
            setError(null);
            if (onSuccess) onSuccess(created);
            onClose();
          },
          onError: (err) => {
            setError((err as Error).message || "Gagal mengimport board.");
          },
        }
      );
    } catch (err) {
      setError("Sintaks JSON tidak valid. Periksa kembali struktur JSON Anda.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-[500px] bg-[#121214] border border-white/10 rounded-[14px] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-[18px] font-medium text-[#F0F0F0] tracking-tight">
              Import board from JSON
            </h2>
            <p className="text-[13px] text-[#787878]">
              Bring in a board from any external AI tool. Nothing is applied until you approve.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] text-[#787878] hover:text-[#F0F0F0] hover:bg-[#1C1C1E] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setMode("paste");
              setError(null);
            }}
            className={`w-full p-4 rounded-[10px] border text-left transition-all flex items-start justify-between ${
              mode === "paste"
                ? "bg-[#18181A] border-[#7F9CF5] ring-1 ring-[#7F9CF5]"
                : "bg-[#141416] border-white/6 hover:border-white/15"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-[8px] bg-white/5 border border-white/8 flex items-center justify-center text-[#F0F0F0]">
                <FileCode className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-[14px] font-medium text-[#F0F0F0]">Paste JSON</div>
                <div className="text-[12px] text-[#787878]">
                  Copy from ChatGPT, Claude, or Gemini and paste it here.
                </div>
              </div>
            </div>
            {mode === "paste" && <Check className="w-4 h-4 text-[#7F9CF5] mt-1" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("upload");
              setError(null);
            }}
            className={`w-full p-4 rounded-[10px] border text-left transition-all flex items-start justify-between ${
              mode === "upload"
                ? "bg-[#18181A] border-[#7F9CF5] ring-1 ring-[#7F9CF5]"
                : "bg-[#141416] border-white/6 hover:border-white/15"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-[8px] bg-white/5 border border-white/8 flex items-center justify-center text-[#F0F0F0]">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-[14px] font-medium text-[#F0F0F0]">Upload .json file</div>
                <div className="text-[12px] text-[#787878]">
                  Import an exported or downloaded board file.
                </div>
              </div>
            </div>
            {mode === "upload" && <Check className="w-4 h-4 text-[#7F9CF5] mt-1" />}
          </button>
        </div>

        {/* Input Area */}
        {mode === "paste" ? (
          <div className="space-y-1.5">
            <textarea
              rows={4}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              placeholder={`{\n  "name": "My AI Project",\n  "description": "Board structure from Gemini"\n}`}
              className="w-full p-3 bg-[#0A0A0C] border border-white/8 rounded-[8px] text-[13px] font-mono text-[#F0F0F0] placeholder-[#525252] outline-none focus:border-[#7F9CF5] transition-colors resize-none"
            />
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
              {jsonText ? "File terdeteksi & terisi" : "Klik untuk memilih file .json"}
            </div>
            <div className="text-[11px] text-[#787878] mt-1">Hanya file format JSON yang didukung</div>
          </div>
        )}

        {error && <div className="text-[12px] text-red-400 bg-red-500/10 p-2.5 rounded-[6px] border border-red-500/20">{error}</div>}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-[14px] font-medium text-[#787878] hover:text-[#F0F0F0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={createProjectMutation.isPending || !jsonText.trim()}
            className="px-4 py-2 bg-[#7F9CF5] hover:bg-[#6b89e3] text-black text-[14px] font-medium rounded-[8px] transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <span>{createProjectMutation.isPending ? "Importing..." : "Continue"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
