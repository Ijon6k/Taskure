"use client";

import { Target, Calendar, Clock } from "lucide-react";
import { ProjectData } from "@/lib/api";
import { formatDateShort } from "@/lib/helpers";
import { ProjectTagsEditor } from "./project-tags-editor";

interface ProjectMetaSectionProps {
  project: ProjectData;
  isEditingInline: boolean;
  name: string;
  setName: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  targetGoal: string;
  setTargetGoal: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  targetDate: string;
  setTargetDate: (val: string) => void;
  tagsInput: string;
  setTagsInput: (val: string) => void;
  parsedTagsList: string[];
}

export function ProjectMetaSection({
  project,
  isEditingInline,
  name,
  setName,
  description,
  setDescription,
  targetGoal,
  setTargetGoal,
  status,
  setStatus,
  targetDate,
  setTargetDate,
  tagsInput,
  setTagsInput,
  parsedTagsList,
}: ProjectMetaSectionProps) {
  const handleAddTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim().toLowerCase().replace(/,/g, "");
    if (!cleanTag) return;
    const currentList = parsedTagsList.map((t) => t.toLowerCase());
    if (!currentList.includes(cleanTag)) {
      const newList = [...parsedTagsList, cleanTag];
      setTagsInput(newList.join(", "));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newList = parsedTagsList.filter(
      (t) => t.toLowerCase() !== tagToRemove.toLowerCase()
    );
    setTagsInput(newList.join(", "));
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Project Name (Inline Editable when isEditingInline is true) */}
      {isEditingInline && (
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-theme-secondary uppercase tracking-[0.5px]">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project Name..."
            className="w-full bg-surface-l3 hover:bg-surface-l4 focus:bg-surface-l4 border border-theme-default focus:border-brand-accent rounded-md px-3 py-1.5 text-[16px] font-semibold text-theme-primary outline-none transition-colors"
          />
        </div>
      )}

      {/* Description */}
      {isEditingInline ? (
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-theme-secondary uppercase tracking-[0.5px]">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add project description..."
            className="w-full bg-surface-l3 hover:bg-surface-l4 focus:bg-surface-l4 border border-theme-default focus:border-brand-accent rounded-md p-2.5 text-[14px] text-theme-primary outline-none transition-colors resize-none leading-[22.75px]"
          />
        </div>
      ) : (
        <p className="text-[14px] text-theme-primary/80 leading-[22.75px] font-normal">
          {project.description || "Project overview and key objectives."}
        </p>
      )}

      {/* Target Goal */}
      {isEditingInline ? (
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-theme-secondary uppercase tracking-[0.5px]">
            Target Goal / Objective
          </label>
          <div className="flex items-start gap-2.5">
            <Target className="w-4 h-4 text-theme-secondary shrink-0 mt-2.5" />
            <textarea
              rows={2}
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              placeholder="Add target goal or objective..."
              className="w-full bg-surface-l3 hover:bg-surface-l4 focus:bg-surface-l4 border border-theme-default focus:border-brand-accent rounded-md p-2.5 text-[14px] text-theme-primary outline-none transition-colors resize-none leading-[22.75px]"
            />
          </div>
        </div>
      ) : (
        targetGoal && (
          <div className="flex items-start gap-2.5 pt-1">
            <Target className="w-4 h-4 text-theme-secondary shrink-0 mt-1" />
            <p className="text-[14px] text-theme-primary/80 leading-[22.75px]">
              {targetGoal}
            </p>
          </div>
        )
      )}

      {/* Metadata Bar: Target Date & Created Date */}
      <div className="flex items-center gap-5 text-[12px] flex-wrap pt-1">
        {/* Target Date */}
        {isEditingInline ? (
          <div className="flex items-center gap-1.5 bg-surface-l3 border border-theme-default rounded-md px-2.5 py-1 font-mono text-theme-secondary">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent text-theme-primary text-[12px] font-mono outline-none cursor-pointer"
            />
          </div>
        ) : (
          targetDate && (
            <div className="flex items-center gap-1.5 text-theme-secondary font-mono">
              <Calendar className="w-3.5 h-3.5 shrink-0 text-theme-tertiary" />
              <span>Target: {formatDateShort(targetDate)}</span>
            </div>
          )
        )}

        {/* Created Date */}
        {project.created_at && (
          <div className="flex items-center gap-1.5 text-theme-secondary font-mono">
            <Clock className="w-3.5 h-3.5 shrink-0 text-theme-tertiary" />
            <span>Created {formatDateShort(project.created_at)}</span>
          </div>
        )}
      </div>

      {/* Project Tags Editor (Modular Component) */}
      <ProjectTagsEditor
        isEditingInline={isEditingInline}
        tagsList={parsedTagsList}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />
    </div>
  );
}
