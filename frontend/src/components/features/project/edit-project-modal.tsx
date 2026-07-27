"use client";

import { useState, useEffect } from "react";
import { X, Pin, Trash2 } from "lucide-react";
import { useUpdateProject, useDeleteProject, ProjectData } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Toggle } from "@/components/ui/toggle";
import { ModalContainer } from "@/components/ui/modal-container";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { ConfirmDeleteProjectModal } from "./confirm-delete-project-modal";

interface EditProjectModalProps {
  isOpen: boolean;
  project: ProjectData | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const PROJECT_ACCENT_COLORS = [
  "#7F9CF5",
  "#B794F6",
  "#68D391",
  "#F6AD8A",
  "#F6A5C0",
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

  const taskCount = (project.columns || []).reduce((acc, col) => acc + (col.tasks?.length || 0), 0);

  return (
    <>
      <ModalContainer isOpen={isOpen && !isDeleteModalOpen} onClose={onClose} maxWidth="max-w-[480px]">
        {/* Header — Completely borderless */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-[16px] shadow-xs shrink-0"
              style={{ backgroundColor: `${color}25` }}
            >
              {icon}
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-theme-primary tracking-tight leading-none">
                Project settings
              </h2>
              <p className="text-[12px] text-theme-secondary mt-1">
                {project.name} · {taskCount} {taskCount === 1 ? "task" : "tasks"}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Integrated Icon + Name Surface Bar */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
              Project Name *
            </label>
            <div className="flex items-center gap-2 bg-surface-l4 focus-within:bg-surface-l4/90 focus-within:ring-2 focus-within:ring-brand-accent/20 rounded-md px-3.5 py-1.5 transition-all">
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="w-7 text-center bg-transparent text-[18px] outline-none shrink-0"
                title="Project icon / emoji"
              />
              <span className="w-px h-5 bg-theme-subtle/60 shrink-0" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="flex-1 bg-transparent text-[15px] font-medium text-theme-primary placeholder-theme-tertiary outline-none py-1"
              />
            </div>
          </div>

          {/* Description Surface */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a brief summary or goal for this project..."
              className="w-full bg-surface-l4 focus:bg-surface-l4/90 focus:ring-2 focus:ring-brand-accent/20 rounded-md p-3.5 text-[15px] text-theme-primary placeholder-theme-tertiary outline-none transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Color Swatch Picker */}
          <ColorSwatchPicker
            label="Accent Color"
            selectedColor={color}
            colors={PROJECT_ACCENT_COLORS}
            onSelect={(selectedHex) => setColor(selectedHex)}
          />

          {/* Status Segmented Control */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
              Project Status
            </label>
            <div className="p-1 bg-surface-l4 rounded-md flex gap-1">
              {STATUS_OPTIONS.map((st) => {
                const isActive = status === st.value;
                return (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setStatus(st.value)}
                    className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-all capitalize cursor-pointer ${
                      isActive
                        ? "bg-surface-l2 text-theme-primary font-semibold shadow-xs"
                        : "text-theme-secondary hover:text-theme-primary hover:bg-surface-l3/50"
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pin to Top — Modern Borderless Card */}
          <div className="p-3.5 bg-surface-l4/60 hover:bg-surface-l4 rounded-md flex items-center justify-between transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-surface-l2 flex items-center justify-center shrink-0">
                <Pin className={`w-4 h-4 ${isPinned ? "text-brand-accent" : "text-theme-tertiary"}`} />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-theme-primary">
                  Pin to top of workspace
                </div>
                <div className="text-[12px] text-theme-secondary">
                  Show at the top of your sidebar and dashboard.
                </div>
              </div>
            </div>
            <Toggle
              checked={isPinned}
              onChange={setIsPinned}
              size="sm"
            />
          </div>

          {/* Destructive Action Row — Completely borderless, quiet red hover */}
          <div className="p-3.5 bg-surface-l4/50 hover:bg-red-500/10 rounded-md flex items-center justify-between gap-3 transition-all group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-red-500/10 group-hover:bg-red-500/20 flex items-center justify-center text-red-400 shrink-0 transition-colors">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-theme-primary group-hover:text-red-400 transition-colors truncate">
                  Delete project
                </div>
                <div className="text-[12px] text-theme-tertiary truncate">
                  Permanently remove board and all tasks
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3.5 py-1.5 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 text-[13px] font-semibold rounded-[6px] transition-all shrink-0 cursor-pointer"
            >
              Delete...
            </button>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-[14px] font-medium text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProjectMutation.isPending || !name.trim()}
              className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-black text-[14px] font-semibold rounded-md transition-all shadow-sm active:scale-[0.98] disabled:opacity-40 cursor-pointer"
            >
              {updateProjectMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </ModalContainer>

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
