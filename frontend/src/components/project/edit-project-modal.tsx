"use client";

import { useState, useEffect } from "react";
import { X, Check, Edit3 } from "lucide-react";
import { useUpdateProject, ProjectData } from "@/lib/api";

interface EditProjectModalProps {
  isOpen: boolean;
  project: ProjectData | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const COLOR_OPTIONS = [
  { name: "Pastel Blue", hex: "#7F9CF5" },
  { name: "Lavender", hex: "#B794F6" },
  { name: "Pastel Green", hex: "#68D391" },
  { name: "Pastel Orange", hex: "#F6AD8A" },
  { name: "Pastel Pink", hex: "#F6A5C0" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
];

export function EditProjectModal({ isOpen, project, onClose, onSuccess }: EditProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#7F9CF5");
  const [status, setStatus] = useState("active");
  const [icon, setIcon] = useState("⚡");

  const updateProjectMutation = useUpdateProject();

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setColor(project.color || "#7F9CF5");
      setStatus(project.status || "active");
      setIcon(project.icon || "⚡");
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateProjectMutation.mutate(
      {
        id: project.id,
        data: {
          name: name.trim(),
          description: description.trim(),
          color,
          status,
          icon,
        },
      },
      {
        onSuccess: () => {
          if (onSuccess) onSuccess();
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-[460px] bg-[#121214] border border-white/10 rounded-[14px] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[6px] bg-[#7F9CF5]/10 flex items-center justify-center text-[#7F9CF5]">
              <Edit3 className="w-4 h-4" />
            </div>
            <h2 className="text-[18px] font-medium text-[#F0F0F0] tracking-tight">
              Edit project
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] text-[#787878] hover:text-[#F0F0F0] hover:bg-[#1C1C1E] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-[#787878] uppercase tracking-[0.5px]">
              Project Name *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-10 h-[38px] text-center bg-[#18181A] border border-white/8 rounded-[6px] text-[16px] outline-none"
              />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 h-[38px] px-3 bg-[#18181A] border border-white/8 focus:border-[#7F9CF5] rounded-[6px] text-[14px] text-[#F0F0F0] outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-[#787878] uppercase tracking-[0.5px]">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-[#18181A] border border-white/8 focus:border-[#7F9CF5] rounded-[6px] text-[14px] text-[#F0F0F0] placeholder-[#525252] outline-none transition-colors resize-none"
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
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-black font-bold" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-[#787878] uppercase tracking-[0.5px]">
              Status
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setStatus(st.value)}
                  className={`flex-1 py-2 text-[12px] font-medium rounded-[6px] border transition-colors capitalize ${
                    status === st.value
                      ? "bg-[#1C1C1E] border-white/20 text-[#F0F0F0]"
                      : "bg-[#141416] border-white/6 text-[#787878] hover:text-[#F0F0F0]"
                  }`}
                >
                  {st.label}
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
              disabled={updateProjectMutation.isPending || !name.trim()}
              className="px-4 py-2 bg-[#7F9CF5] hover:bg-[#6b89e3] text-black text-[14px] font-medium rounded-[6px] transition-colors disabled:opacity-40"
            >
              {updateProjectMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
