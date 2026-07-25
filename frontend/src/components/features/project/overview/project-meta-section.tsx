"use client";

import { Target, Calendar, Tag } from "lucide-react";
import { ProjectData } from "@/lib/api";
import { formatDateShort } from "@/lib/helpers";
import { TagChip } from "@/components/ui/tag-chip";

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
  return (
    <div className="space-y-3.5 pt-1">
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

      {/* Description (In-Place Transformation) */}
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
          {project.description || "Redesign the public REST API to support the v2 schema and OAuth 2.1."}
        </p>
      )}

      {/* Target Goal with Target Icon (In-Place Transformation) */}
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

      {/* Status & Target Date Line (In-Place Transformation) */}
      <div className="flex items-center gap-4 text-[12px] pt-1">
        {isEditingInline ? (
          <div className="flex items-center gap-1.5 bg-surface-l3 border border-theme-default rounded-md px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent text-theme-primary text-[12px] font-medium outline-none cursor-pointer capitalize"
            >
              <option value="active" className="bg-surface-l4 text-theme-primary">active</option>
              <option value="paused" className="bg-surface-l4 text-theme-primary">paused</option>
              <option value="completed" className="bg-surface-l4 text-theme-primary">completed</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
            <span className="text-theme-secondary capitalize">{project.status || "active"}</span>
          </div>
        )}

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
          <div className="flex items-center gap-1.5 text-theme-secondary font-mono">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{targetDate ? formatDateShort(targetDate) : "Sep 30"}</span>
          </div>
        )}
      </div>

      {/* Project Tags (In-Place Transformation) */}
      {isEditingInline ? (
        <div className="space-y-1 pt-1">
          <label className="text-[11px] font-mono text-theme-secondary uppercase tracking-[0.5px]">
            Tags (comma-separated)
          </label>
          <div className="flex items-center gap-2 bg-surface-l3 border border-theme-default rounded-md px-3 py-1.5">
            <Tag className="w-3.5 h-3.5 text-theme-secondary shrink-0" />
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags (api, backend, q3)..."
              className="w-full bg-transparent text-[13px] text-theme-primary placeholder:text-theme-tertiary outline-none font-mono"
            />
          </div>
        </div>
      ) : (
        parsedTagsList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {parsedTagsList.map((tag, index) => (
              <TagChip key={`${tag}-${index}`} label={tag} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
