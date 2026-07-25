"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, FolderPlus, ArrowRight, FileCode } from "lucide-react";
import { useCreateProject, ProjectData } from "@/lib/api";
import { createProjectSchema, CreateProjectSchema } from "@/lib/validations";
import { ImportJsonModal } from "./import-json-modal";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";

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
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const createProjectMutation = useCreateProject();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateProjectSchema>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#7F9CF5",
      icon: "📌",
      status: "active",
    },
  });

  const selectedColor = watch("color");

  useHotkeys("esc", () => {
    if (isOpen) onClose();
  }, { enabled: isOpen });

  if (!isOpen) return null;

  const onSubmit = (data: CreateProjectSchema) => {
    createProjectMutation.mutate(
      {
        name: data.name,
        description: data.description || "",
        color: data.color,
        icon: data.icon,
        status: data.status,
      },
      {
        onSuccess: (created) => {
          toast.success(`Project "${created.name}" created!`);
          if (onSuccess) onSuccess(created);
          reset();
          onClose();
        },
        onError: (err) => {
          toast.error("Failed to create project: " + err.message);
        },
      }
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-[460px] bg-surface-l5 border border-theme-default rounded-md p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-theme-subtle pb-4">
            <div className="space-y-0.5">
              <h2 className="text-[18px] font-medium text-theme-primary tracking-tight">
                New project
              </h2>
              <p className="text-[12px] text-theme-secondary">
                Start fresh or bring in a board from JSON.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[6px] text-theme-secondary hover:text-theme-primary hover:bg-surface-l3 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
                Project name *
              </label>
              <input
                type="text"
                autoFocus
                {...register("name")}
                placeholder="e.g. Mobile App Redesign"
                className="w-full h-[38px] px-3 bg-surface-l4 border border-theme-subtle focus:border-brand-accent rounded-[6px] text-[14px] text-theme-primary placeholder:text-theme-tertiary outline-none transition-colors"
              />
              {errors.name && (
                <p className="text-[11px] text-semantic-danger font-medium">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
                Accent
              </label>
              <div className="flex items-center gap-3">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setValue("color", c.hex)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      selectedColor === c.hex
                        ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                        : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Template Selection Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="p-3.5 bg-surface-l4 hover:bg-surface-l5 border border-theme-subtle rounded-[10px] text-left transition-all space-y-1 group disabled:opacity-40"
              >
                <div className="flex items-center gap-2 text-[13px] font-medium text-theme-primary">
                  <FolderPlus className="w-4 h-4 text-brand-accent" />
                  <span>Blank project</span>
                </div>
                <p className="text-[11px] text-theme-secondary leading-normal">
                  Empty board with default columns.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsImportJsonOpen(true)}
                className="p-3.5 bg-surface-l4 hover:bg-surface-l5 border border-theme-subtle rounded-[10px] text-left transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between text-[13px] font-medium text-theme-primary">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-accent" />
                    <span>From JSON</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-theme-secondary group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-theme-secondary leading-normal">
                  Paste or upload a board.
                </p>
              </button>
            </div>
          </form>
        </div>
      </div>

      <ImportJsonModal
        isOpen={isImportJsonOpen}
        onClose={() => setIsImportJsonOpen(false)}
        onSuccess={(created) => {
          if (onSuccess) onSuccess(created);
          onClose();
        }}
      />
    </>
  );
}
