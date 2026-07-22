"use client";

import { useState } from "react";
import { X, Check, FolderPlus } from "lucide-react";
import { useCreateProject, ProjectData } from "@/lib/api";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newProj: ProjectData) => void;
}

const COLOR_OPTIONS = [
  { name: "Pastel Blue", hex: "#7F9CF5" },
  { name: "Lavender", hex: "#B794F6" },
  { name: "Pastel Green", hex: "#68D391" },
  { name: "Pastel Orange", hex: "#F6AD8A" },
  { name: "Pastel Pink", hex: "#F6A5C0" },
];

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#7F9CF5");
  const createProjectMutation = useCreateProject();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createProjectMutation.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        color,
        icon: "📌",
      },
      {
        onSuccess: (created) => {
          if (onSuccess) onSuccess(created);
          setName("");
          setDescription("");
          onClose();
        },
        onError: (err) => {
          alert("Gagal membuat projek: " + (err as Error).message);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-[440px] bg-[#0C0C0C] border border-white/8 rounded-[12px] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[6px] bg-[#7F9CF5]/10 flex items-center justify-center text-[#7F9CF5]">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h2 className="text-[18px] font-normal text-[#F0F0F0] tracking-tight">
              New project
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] text-[#787878] hover:text-[#F0F0F0] hover:bg-[#141414] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-[#787878] uppercase tracking-[0.5px]">
              Project Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile App Redesign"
              className="w-full h-[38px] px-3 bg-[#141414] border border-white/6 focus:border-[#7F9CF5] rounded-[6px] text-[14px] text-[#F0F0F0] placeholder-[#525252] outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-[#787878] uppercase tracking-[0.5px]">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the project scope and goals..."
              className="w-full p-3 bg-[#141414] border border-white/6 focus:border-[#7F9CF5] rounded-[6px] text-[14px] text-[#F0F0F0] placeholder-[#525252] outline-none transition-colors resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-[#787878] uppercase tracking-[0.5px]">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    color === c.hex
                      ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                      : "hover:scale-105 opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-black font-bold" />}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-white/6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-[6px] text-[14px] font-medium text-[#787878] hover:text-[#F0F0F0] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createProjectMutation.isPending || !name.trim()}
              className="px-4 py-2 bg-[#7F9CF5] hover:bg-[#6b89e3] text-black text-[14px] font-medium rounded-[6px] transition-colors disabled:opacity-40"
            >
              {createProjectMutation.isPending ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
