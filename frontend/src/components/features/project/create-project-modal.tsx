"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, FolderPlus, ArrowRight, FileCode } from "lucide-react";
import { useCreateProject, ProjectData } from "@/lib/api";
import { createProjectSchema, CreateProjectSchema } from "@/lib/validations";
import { ImportJsonModal } from "./import-json-modal";
import { ModalContainer } from "@/components/ui/modal-container";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { toast } from "sonner";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newProj: ProjectData) => void;
}

const PROJECT_ACCENT_COLORS = [
  "#7F9CF5",
  "#B794F6",
  "#68D391",
  "#F6AD8A",
  "#F6A5C0",
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
  const iconValue = watch("icon");

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
      <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-[460px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="space-y-0.5">
            <h2 className="text-[20px] font-semibold text-theme-primary tracking-tight">
              New project
            </h2>
            <p className="text-[13px] text-theme-secondary">
              Start fresh or bring in a board from JSON.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-theme-tertiary hover:text-theme-primary hover:bg-surface-l4 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Integrated Icon + Name Bar */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-theme-secondary uppercase tracking-[0.5px]">
              Project Name *
            </label>
            <div className="flex items-center gap-2 bg-surface-l4 border border-transparent focus-within:border-brand-accent/40 focus-within:ring-2 focus-within:ring-brand-accent/15 rounded-md px-3 py-1 transition-all">
              <input
                type="text"
                value={iconValue}
                onChange={(e) => setValue("icon", e.target.value)}
                maxLength={4}
                className="w-7 text-center bg-transparent text-[18px] outline-none shrink-0"
                title="Project icon / emoji"
              />
              <span className="w-px h-5 bg-theme-subtle shrink-0" />
              <input
                type="text"
                autoFocus
                {...register("name")}
                placeholder="e.g. Mobile App Redesign"
                className="flex-1 bg-transparent text-[15px] font-medium text-theme-primary placeholder-theme-tertiary outline-none py-1.5"
              />
            </div>
            {errors.name?.message && (
              <p className="text-[13px] text-red-400 font-medium pt-0.5">{errors.name.message}</p>
            )}
          </div>

          {/* Accent Color Swatch */}
          <ColorSwatchPicker
            label="Accent"
            selectedColor={selectedColor}
            colors={PROJECT_ACCENT_COLORS}
            onSelect={(color) => setValue("color", color)}
          />

          {/* Template Selection Cards — Clean Borderless Surface Cards */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="submit"
              disabled={createProjectMutation.isPending}
              className="p-4 bg-surface-l4 hover:bg-surface-hover rounded-md text-left transition-all space-y-1.5 group disabled:opacity-40 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-[14px] font-semibold text-theme-primary">
                <FolderPlus className="w-4 h-4 text-brand-accent" />
                <span>Blank project</span>
              </div>
              <p className="text-[12px] text-theme-secondary leading-relaxed">
                Empty board with default columns.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsImportJsonOpen(true)}
              className="p-4 bg-surface-l4 hover:bg-surface-hover rounded-md text-left transition-all space-y-1.5 group cursor-pointer"
            >
              <div className="flex items-center justify-between text-[14px] font-semibold text-theme-primary">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-brand-accent" />
                  <span>From JSON</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-theme-secondary group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[12px] text-theme-secondary leading-relaxed">
                Paste or upload a board.
              </p>
            </button>
          </div>
        </form>
      </ModalContainer>

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
