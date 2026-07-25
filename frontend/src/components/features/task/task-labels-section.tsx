"use client";

import { TagChip } from "@/components/ui/tag-chip";
import { TagPickerPopover } from "./tag-picker-popover";
import { useTaskLabels } from "@/hooks/use-task-labels";
import { getTagStyle } from "@/lib/tags";

interface TaskLabelsSectionProps {
  labels?: string[];
  onChange?: (labels: string[]) => void;
  projectId?: string;
}

export function TaskLabelsSection({ labels = [], onChange, projectId = "" }: TaskLabelsSectionProps) {
  const {
    projectTags,
    globalTags,
    toggleLabel,
    createProjectTag,
  } = useTaskLabels(projectId, labels, onChange);

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      {/* Attached Task Tags */}
      {labels.map((label) => {
        const pMatch = projectTags.find((t) => t.name.toLowerCase() === label.toLowerCase());
        const gMatch = globalTags.find((t) => t.name.toLowerCase() === label.toLowerCase());
        const color = pMatch?.color || gMatch?.color || "#8A8F98";

        return (
          <TagChip
            key={label}
            label={label}
            color={color}
            onRemove={() => toggleLabel(label)}
          />
        );
      })}

      {/* Lightweight Popover Tag Picker Trigger */}
      <TagPickerPopover
        labels={labels}
        onToggleLabel={toggleLabel}
        onCreateProjectTag={createProjectTag}
        projectId={projectId}
      />
    </div>
  );
}
