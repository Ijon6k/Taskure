"use client";

import { useState, useEffect } from "react";
import { X, Pin, Trash2, Check } from "lucide-react";
import { useUpdateProject, useDeleteProject } from "@/lib/api";
import { EditableProject } from "@/store/use-ui-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Toggle } from "@/components/ui/toggle";
import { ModalContainer } from "@/components/ui/modal-container";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateFocusQueries } from "@/lib/api/queries/use-workspace";
import { ConfirmDeleteProjectModal } from "./confirm-delete-project-modal";
import { columnsService } from "@/lib/api/services/columns.service";

interface EditProjectModalProps {
  isOpen: boolean;
  project: EditableProject | null;
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
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

export function EditProjectModal({ isOpen, project, onClose, onSuccess }: EditProjectModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#7F9CF5");
  const [status, setStatus] = useState("active");
  const [icon, setIcon] = useState("⚡");
  const [isPinned, setIsPinned] = useState(false);
  const [focusEnabled, setFocusEnabled] = useState(true);
  const [columnBehaviors, setColumnBehaviors] = useState<Record<string, "active" | "completed">>({});
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
      setFocusEnabled(project.focus_enabled ?? true);
      const initialBehaviors: Record<string, "active" | "completed"> = {};
      (project.columns || []).forEach((col) => {
        initialBehaviors[col.id] = col.behavior || "active";
      });
      setColumnBehaviors(initialBehaviors);
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalIsPinned = (status === "completed" || status === "archived") ? false : isPinned;

    updateProjectMutation.mutate(
      {
        id: project.id,
        data: {
          name: name.trim(),
          description: description.trim(),
          color,
          status,
          icon,
          is_pinned: finalIsPinned,
          focus_enabled: focusEnabled,
        },
      },
      {
        onSuccess: async () => {
          const updatePromises = (project.columns || []).map((col) => {
            const newBehavior = columnBehaviors[col.id] || "active";
            if (newBehavior !== col.behavior) {
              return columnsService.updateColumn(col.id, { behavior: newBehavior });
            }
            return Promise.resolve();
          });
          await Promise.all(updatePromises);
          invalidateFocusQueries(queryClient);
          toast.success("Saved");
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

  const taskCount = (project.columns || []).reduce(
    (acc, col) => acc + (col.task_count ?? 0),
    0
  );

  return (
    <>
      <ModalContainer isOpen={isOpen && !isDeleteModalOpen} onClose={onClose} maxWidth="max-w-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center text-[18px] shrink-0"
              style={{ backgroundColor: `${color}20` }}
            >
              {icon}
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-theme-primary tracking-tight leading-none">
                Project settings
              </h2>
              <p className="text-[12px] text-theme-tertiary mt-1">
                {project.name} · {taskCount} {taskCount === 1 ? "task" : "tasks"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md text-theme-tertiary hover:text-theme-primary hover:bg-surface-l3 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body — Calm Editorial Layout */}
        <form onSubmit={handleSubmit} className="pt-4 space-y-6">
          {/* Project Identity */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-theme-tertiary uppercase tracking-wider">
                Project Name
              </label>
              <div className="flex items-center gap-2.5 bg-surface-l3/40 focus-within:bg-surface-l3/70 rounded-md px-3.5 py-1.5 transition-colors">
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={4}
                  className="w-7 text-center bg-transparent text-[17px] outline-none shrink-0"
                  title="Project icon / emoji"
                />
                <span className="w-px h-4 bg-theme-tertiary/20 shrink-0" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  className="flex-1 bg-transparent text-[14px] font-medium text-theme-primary placeholder-theme-tertiary outline-none py-1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-theme-tertiary uppercase tracking-wider">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a brief summary or goal for this project..."
                className="w-full bg-surface-l3/40 focus:bg-surface-l3/70 rounded-md p-3 text-[13px] text-theme-primary placeholder-theme-tertiary outline-none transition-colors resize-none leading-relaxed"
              />
            </div>

            <ColorSwatchPicker
              label="Accent Color"
              selectedColor={color}
              colors={PROJECT_ACCENT_COLORS}
              onSelect={(selectedHex) => setColor(selectedHex)}
            />

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-theme-tertiary uppercase tracking-wider">
                Status
              </label>
              <div className="p-1 bg-surface-l3/40 rounded-md flex gap-1">
                {STATUS_OPTIONS.map((st) => {
                  const isActive = status === st.value;
                  return (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setStatus(st.value)}
                      className={`flex-1 py-1.5 text-[12px] font-medium rounded transition-all capitalize cursor-pointer ${
                        isActive
                          ? "bg-surface-l2 text-theme-primary font-semibold shadow-xs"
                          : "text-theme-tertiary hover:text-theme-primary hover:bg-surface-l3/50"
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>



          {/* Preferences & Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="space-y-0.5">
                <div className="text-[13px] font-medium text-theme-primary flex items-center gap-1.5">
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? "text-brand-accent rotate-45" : "text-theme-tertiary"}`} />
                  <span>Pin to top</span>
                </div>
                <div className="text-[12px] text-theme-tertiary">
                  Show at the top of your sidebar and home dashboard.
                </div>
              </div>
              <Toggle
                checked={isPinned}
                onChange={setIsPinned}
                size="sm"
              />
            </div>
          </div>

          {/* Footer Bar */}
          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-[12px] font-medium text-red-400/80 hover:text-red-400 transition-colors cursor-pointer"
            >
              Delete project...
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md text-[13px] font-medium text-theme-tertiary hover:text-theme-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateProjectMutation.isPending || !name.trim()}
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-slate-950 text-[13px] font-semibold rounded-md transition-all shadow-xs active:scale-[0.98] disabled:opacity-40 cursor-pointer"
              >
                {updateProjectMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
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
