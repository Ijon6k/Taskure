"use client";

import { Target, Calendar, Clock } from "lucide-react";
import { ProjectData } from "@/lib/api";
import { formatDateShort } from "@/lib/helpers";
import { ProjectTagsEditor } from "./project-tags-editor";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { DatePickerPopover } from "@/components/ui/overlays/date-picker-popover";

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
    <div className="space-y-5 pt-1">
      {/* Project Name */}
      {isEditingInline ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="document-input"
          style={{ fontSize: "22px", fontWeight: 600 }}
        />
      ) : null}

      {/* Description */}
      {isEditingInline ? (
        <AutoResizeTextarea
          minRows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a brief description..."
          className="document-textarea"
        />
      ) : (
        <p className="text-[14px] text-theme-primary/80 leading-relaxed">
          {project.description || "Project overview and key objectives."}
        </p>
      )}

      {/* Target Goal */}
      {isEditingInline ? (
        <div className="flex items-start gap-3">
          <Target className="w-4 h-4 text-theme-tertiary shrink-0 mt-2" />
          <AutoResizeTextarea
            minRows={2}
            value={targetGoal}
            onChange={(e) => setTargetGoal(e.target.value)}
            placeholder="What are you trying to achieve?"
            className="document-textarea flex-1"
          />
        </div>
      ) : (
        targetGoal && (
          <div className="flex items-start gap-3 pt-0.5">
            <Target className="w-4 h-4 text-theme-tertiary shrink-0 mt-0.5" />
            <p className="text-[14px] text-theme-primary/80 leading-relaxed">
              {targetGoal}
            </p>
          </div>
        )
      )}

      {/* Metadata Row: Target Date & Created Date */}
      <div className="flex items-center gap-6 text-[13px] flex-wrap">
        {isEditingInline ? (
          <div className="flex items-center gap-2 text-theme-secondary w-60">
            <DatePickerPopover
              value={targetDate}
              onChange={(iso) => setTargetDate(iso || "")}
              placeholder="Pick target date"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-theme-secondary font-mono">
            <Calendar className="w-3.5 h-3.5 text-theme-tertiary shrink-0" />
            <span>Target: {targetDate ? formatDateShort(targetDate) : "Not set"}</span>
          </div>
        )}

        {project.created_at && (
          <div className="flex items-center gap-1.5 text-theme-secondary font-mono">
            <Clock className="w-3.5 h-3.5 text-theme-tertiary shrink-0" />
            <span>Created {formatDateShort(project.created_at)}</span>
          </div>
        )}
      </div>

      {/* Status Selector (edit mode only) */}
      {isEditingInline && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-theme-secondary uppercase tracking-wider">Status</span>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px] h-8 text-[13px] bg-surface-l3 border border-theme-subtle">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Project Tags Editor */}
      <ProjectTagsEditor
        isEditingInline={isEditingInline}
        tagsList={parsedTagsList}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />
    </div>
  );
}
