"use client";

import { useState, useEffect } from "react";
import { X, Check, Edit3, Pin } from "lucide-react";
import { useUpdateProject, useDeleteProject, ProjectData } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmDeleteProjectModal } from "./confirm-delete-project-modal";

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
  const [isPinned, setIsPinned] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const router = useRouter();

  useHotkeys("esc", () => {
    if (isOpen && !isDeleteModalOpen) onClose();
  }, { enabled: isOpen });

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setColor(project.color || "#7F9CF5");
      setStatus(project.status || "active");
      setIcon(project.icon || "⚡");
      setIsPinned(project.is_pinned || false);
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
          is_pinned: isPinned,
        },
      },
      {
        onSuccess: () => {
          toast.success("Project updated successfully!");
          if (onSuccess) onSuccess();
          onClose();
        },
        onError: (err) => {
          toast.error("Failed to update project: " + err.message);
        },
      }
    );
  };

  const handleDeleteConfirm = () => {
    deleteProjectMutation.mutate(project.id, {
      onSuccess: () => {
        toast.success("Project deleted!");
        setIsDeleteModalOpen(false);
        onClose();
        router.push("/projects");
      },
      onError: (err) => {
        toast.error("Failed to delete project: " + err.message);
      },
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-[460px] bg-surface-l5 border border-theme-default rounded-md p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-theme-subtle pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[6px] bg-brand-accent-subtle flex items-center justify-center text-brand-accent">
                <Edit3 className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-medium text-theme-primary tracking-tight">
                Project settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[6px] text-theme-secondary hover:text-theme-primary hover:bg-surface-l3 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
                Project Name *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-10 h-[38px] text-center bg-surface-l4 border border-theme-subtle rounded-[6px] text-[16px] outline-none"
                />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 h-[38px] px-3 bg-surface-l4 border border-theme-subtle focus:border-brand-accent rounded-[6px] text-[14px] text-theme-primary outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-surface-l4 border border-theme-subtle focus:border-brand-accent rounded-[6px] text-[14px] text-theme-primary placeholder:text-theme-tertiary outline-none transition-colors resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
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
              <label className="block text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
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
                        ? "bg-surface-l3 border-theme-strong text-theme-primary"
                        : "bg-surface-l4 border-theme-subtle text-theme-secondary hover:text-theme-primary"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pin Toggle */}
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2.5">
                <Pin className={`w-4 h-4 ${isPinned ? "text-brand-accent" : "text-theme-secondary"}`} />
                <span className="text-[13px] font-medium text-theme-primary">
                  Pin to top
                </span>
              </div>
              <Toggle
                checked={isPinned}
                onChange={setIsPinned}
                size="sm"
              />
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-semantic-danger/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[12px] font-medium text-semantic-danger uppercase tracking-[0.5px]">
                  Danger Zone
                </span>
              </div>
              <div className="bg-semantic-danger-subtle border border-semantic-danger/15 rounded-[8px] p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-theme-primary">
                    Delete this project
                  </p>
                  <p className="text-[11px] text-theme-tertiary">
                    All columns, tasks, and data will be permanently deleted.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-3 py-1.5 bg-semantic-danger hover:bg-red-600 text-white text-[12px] font-medium rounded-[6px] transition-colors shrink-0"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-theme-subtle flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-[6px] text-[14px] font-medium text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateProjectMutation.isPending || !name.trim()}
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-black text-[14px] font-medium rounded-[6px] transition-colors disabled:opacity-40"
              >
                {updateProjectMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDeleteProjectModal
        isOpen={isDeleteModalOpen}
        projectName={project.name}
        isPending={deleteProjectMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
