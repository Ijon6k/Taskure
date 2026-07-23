export interface TagConfig {
  id: string;
  label: string;
  category: "activity" | "nature";
  color: string;
  bgSubtle: string;
  borderSubtle: string;
}

export const GENERIC_TAGS: TagConfig[] = [
  // --- 1. JENIS KEGIATAN (Activity Types) ---
  {
    id: "meeting",
    label: "Meeting",
    category: "activity",
    color: "#8B5CF6",
    bgSubtle: "rgba(139, 92, 246, 0.14)",
    borderSubtle: "rgba(139, 92, 246, 0.30)",
  },
  {
    id: "planning",
    label: "Planning",
    category: "activity",
    color: "#06B6D4",
    bgSubtle: "rgba(6, 182, 212, 0.14)",
    borderSubtle: "rgba(6, 182, 212, 0.30)",
  },
  {
    id: "research",
    label: "Research",
    category: "activity",
    color: "#F59E0B",
    bgSubtle: "rgba(245, 158, 11, 0.14)",
    borderSubtle: "rgba(245, 158, 11, 0.30)",
  },
  {
    id: "review",
    label: "Review",
    category: "activity",
    color: "#3B82F6",
    bgSubtle: "rgba(59, 130, 246, 0.14)",
    borderSubtle: "rgba(59, 130, 246, 0.30)",
  },
  {
    id: "writing",
    label: "Writing",
    category: "activity",
    color: "#68D391",
    bgSubtle: "rgba(104, 211, 145, 0.14)",
    borderSubtle: "rgba(104, 211, 145, 0.30)",
  },
  {
    id: "execution",
    label: "Execution",
    category: "activity",
    color: "#7F9CF5",
    bgSubtle: "rgba(127, 156, 245, 0.14)",
    borderSubtle: "rgba(127, 156, 245, 0.30)",
  },
  {
    id: "testing",
    label: "Testing",
    category: "activity",
    color: "#4FD1C5",
    bgSubtle: "rgba(79, 209, 197, 0.14)",
    borderSubtle: "rgba(79, 209, 197, 0.30)",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    category: "activity",
    color: "#B794F6",
    bgSubtle: "rgba(183, 148, 246, 0.14)",
    borderSubtle: "rgba(183, 148, 246, 0.30)",
  },
  {
    id: "event",
    label: "Event",
    category: "activity",
    color: "#F6A5C0",
    bgSubtle: "rgba(246, 165, 192, 0.14)",
    borderSubtle: "rgba(246, 165, 192, 0.30)",
  },
  {
    id: "followup",
    label: "Follow-up",
    category: "activity",
    color: "#F6AD8A",
    bgSubtle: "rgba(246, 173, 138, 0.14)",
    borderSubtle: "rgba(246, 173, 138, 0.30)",
  },

  // --- 2. SIFAT / KARAKTERISTIK TUGAS (Nature & Urgency) ---
  {
    id: "urgent",
    label: "Urgent",
    category: "nature",
    color: "#EF4444",
    bgSubtle: "rgba(239, 68, 68, 0.14)",
    borderSubtle: "rgba(239, 68, 68, 0.30)",
  },
  {
    id: "important",
    label: "Important",
    category: "nature",
    color: "#F97316",
    bgSubtle: "rgba(249, 115, 22, 0.14)",
    borderSubtle: "rgba(249, 115, 22, 0.30)",
  },
  {
    id: "routine",
    label: "Routine",
    category: "nature",
    color: "#10B981",
    bgSubtle: "rgba(16, 185, 129, 0.14)",
    borderSubtle: "rgba(16, 185, 129, 0.30)",
  },
  {
    id: "idea",
    label: "Idea",
    category: "nature",
    color: "#F6E05E",
    bgSubtle: "rgba(246, 224, 94, 0.14)",
    borderSubtle: "rgba(246, 224, 94, 0.30)",
  },
  {
    id: "flexible",
    label: "Flexible",
    category: "nature",
    color: "#84CC16",
    bgSubtle: "rgba(132, 204, 22, 0.14)",
    borderSubtle: "rgba(132, 204, 22, 0.30)",
  },
  {
    id: "blocking",
    label: "Blocking",
    category: "nature",
    color: "#F6685E",
    bgSubtle: "rgba(246, 104, 94, 0.14)",
    borderSubtle: "rgba(246, 104, 94, 0.30)",
  },
  {
    id: "quickfix",
    label: "Quick Fix",
    category: "nature",
    color: "#EC4899",
    bgSubtle: "rgba(236, 72, 153, 0.14)",
    borderSubtle: "rgba(236, 72, 153, 0.30)",
  },
];

// Rich 16-color palette for custom tag creation
export const TAG_COLOR_PALETTE = [
  "#3B82F6", // Blue
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#68D391", // Soft Green
  "#84CC16", // Lime
  "#F59E0B", // Amber
  "#F6E05E", // Yellow
  "#F97316", // Orange
  "#F6AD8A", // Coral
  "#EF4444", // Red
  "#F6685E", // Soft Red
  "#EC4899", // Pink
  "#F6A5C0", // Soft Pink
  "#8B5CF6", // Violet
  "#B794F6", // Soft Purple
  "#7F9CF5", // Indigo Blue
];

export function getTagConfig(tagName: string, customColor?: string): TagConfig {
  const cleanName = tagName.trim();
  const lowerName = cleanName.toLowerCase();

  const found = GENERIC_TAGS.find(
    (t) => t.id === lowerName || t.label.toLowerCase() === lowerName
  );

  if (found && !customColor) {
    return found;
  }

  const baseColor = customColor || "#7F9CF5";
  return {
    id: lowerName,
    label: cleanName,
    category: "nature",
    color: baseColor,
    bgSubtle: `${baseColor}22`,
    borderSubtle: `${baseColor}44`,
  };
}
