export interface TagCategory {
  id: string;
  name: string;
}

export interface CustomTag {
  id: string;
  name: string;
  color: string; // Color name (e.g. "purple", "blue") or Hex code (e.g. "#B794F6")
  categoryId?: string;
}

export interface TagConfig {
  id: string;
  label: string;
  color: string;
  bgSubtle: string;
  borderSubtle: string;
  categoryName?: string;
}

// Supported Named Colors Map for AI Prompts & Human Ease
export const COLOR_NAME_MAP: Record<string, string> = {
  gray: "#8A8F98",
  blue: "#3B82F6",
  cyan: "#06B6D4",
  emerald: "#10B981",
  green: "#68D391",
  lime: "#84CC16",
  amber: "#F59E0B",
  yellow: "#F6E05E",
  orange: "#F97316",
  coral: "#F6AD8A",
  red: "#EF4444",
  "soft-red": "#F6685E",
  pink: "#EC4899",
  "soft-pink": "#F6A5C0",
  violet: "#8B5CF6",
  purple: "#B794F6",
  indigo: "#7F9CF5",
};

export const AVAILABLE_COLOR_NAMES = Object.keys(COLOR_NAME_MAP);

// Resolves a color name (e.g. "purple", "blue") or hex code to valid CSS Hex
export function resolveColorHex(inputColor?: string): string {
  if (!inputColor) return "#8A8F98";
  const clean = inputColor.trim().toLowerCase();
  if (COLOR_NAME_MAP[clean]) {
    return COLOR_NAME_MAP[clean];
  }
  if (inputColor.startsWith("#")) {
    return inputColor;
  }
  return "#8A8F98";
}

// Unified Task Tag & Label Extractor
export function extractTaskTags(task: { tags?: string[]; labels?: any[] } | null | undefined): string[] {
  if (!task) return [];
  const fromTags = task.tags || [];
  const fromLabels = (task.labels || []).map((lbl: any) =>
    typeof lbl === "string" ? lbl : lbl.name
  );
  return Array.from(new Set([...fromTags, ...fromLabels])).filter(Boolean);
}

// Helper for Color Opacities
export function getTagStyle(colorInput: string) {
  const hex = resolveColorHex(colorInput);
  return {
    color: hex,
    bgSubtle: `${hex}22`,
    borderSubtle: `${hex}44`,
  };
}

// Palette for Swatches
export const TAG_COLOR_PALETTE = [
  "#8A8F98", // Neutral Gray (Default)
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

// Keys for LocalStorage
const GLOBAL_CATEGORIES_KEY = "kanban_global_tag_categories";
const GLOBAL_TAGS_KEY = "kanban_global_tags";
const PROJECT_TAGS_PREFIX = "kanban_project_tags_";

// Helper to Safely Access LocalStorage with In-Memory Cache
const storageCache = new Map<string, any>();

function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  if (storageCache.has(key)) {
    return storageCache.get(key) as T;
  }
  try {
    const item = localStorage.getItem(key);
    const parsed = item ? JSON.parse(item) : defaultValue;
    storageCache.set(key, parsed);
    return parsed;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  storageCache.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write errors
  }
}

// ── 1. PROJECT TAGS (Strictly Manual Drawer Tags per Project) ───────────────

export function getProjectTags(projectId: string): CustomTag[] {
  if (!projectId) return [];
  return getStorage<CustomTag[]>(`${PROJECT_TAGS_PREFIX}${projectId}`, []);
}

export function saveProjectTag(projectId: string, tag: CustomTag): CustomTag[] {
  if (!projectId) return [];
  const existing = getProjectTags(projectId);
  const index = existing.findIndex((t) => t.id === tag.id || t.name.toLowerCase() === tag.name.toLowerCase());

  let updated: CustomTag[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = { ...existing[index], ...tag };
  } else {
    updated = [...existing, tag];
  }

  setStorage(`${PROJECT_TAGS_PREFIX}${projectId}`, updated);
  return updated;
}

export function deleteProjectTag(projectId: string, tagId: string): CustomTag[] {
  if (!projectId) return [];
  const existing = getProjectTags(projectId);
  const updated = existing.filter((t) => t.id !== tagId);
  setStorage(`${PROJECT_TAGS_PREFIX}${projectId}`, updated);
  return updated;
}

// ── 2. GLOBAL CATEGORIES & TAGS (SETTINGS) ──────────────────────────────────

export function getGlobalCategories(): TagCategory[] {
  return getStorage<TagCategory[]>(GLOBAL_CATEGORIES_KEY, []);
}

export function saveGlobalCategory(category: TagCategory): TagCategory[] {
  const existing = getGlobalCategories();
  const index = existing.findIndex((c) => c.id === category.id);
  let updated: TagCategory[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = category;
  } else {
    updated = [...existing, category];
  }
  setStorage(GLOBAL_CATEGORIES_KEY, updated);
  return updated;
}

export function deleteGlobalCategory(catId: string): TagCategory[] {
  const existingCategories = getGlobalCategories();
  const updatedCategories = existingCategories.filter((c) => c.id !== catId);
  setStorage(GLOBAL_CATEGORIES_KEY, updatedCategories);

  // Remove category link from associated tags
  const existingTags = getGlobalTags();
  const updatedTags = existingTags.map((t) => (t.categoryId === catId ? { ...t, categoryId: undefined } : t));
  setStorage(GLOBAL_TAGS_KEY, updatedTags);

  return updatedCategories;
}

export function getGlobalTags(): CustomTag[] {
  return getStorage<CustomTag[]>(GLOBAL_TAGS_KEY, []);
}

export function saveGlobalTag(tag: CustomTag): CustomTag[] {
  const existing = getGlobalTags();
  const index = existing.findIndex((t) => t.id === tag.id);
  let updated: CustomTag[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = tag;
  } else {
    updated = [...existing, tag];
  }
  setStorage(GLOBAL_TAGS_KEY, updated);
  return updated;
}

export function deleteGlobalTag(tagId: string): CustomTag[] {
  const existing = getGlobalTags();
  const updated = existing.filter((t) => t.id !== tagId);
  setStorage(GLOBAL_TAGS_KEY, updated);
  return updated;
}

// ── 3. JSON IMPORT & EXPORT FOR TAG TEMPLATES (WITH AI PROMPT COLOR CODES) ──

export function exportTagsJson(): string {
  const categories = getGlobalCategories();
  const tags = getGlobalTags();

  const exportObject = {
    _instructions_for_ai: "Available color names for tags: gray, blue, cyan, emerald, green, lime, amber, yellow, orange, coral, red, soft-red, pink, soft-pink, violet, purple, indigo.",
    available_color_names: AVAILABLE_COLOR_NAMES,
    categories,
    tags,
  };

  return JSON.stringify(exportObject, null, 2);
}

export function importTagsJson(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object") {
      return { success: false, message: "Invalid JSON object format." };
    }

    const categories: TagCategory[] = Array.isArray(parsed.categories) ? parsed.categories : [];
    const rawTags: CustomTag[] = Array.isArray(parsed.tags) ? parsed.tags : [];

    // Sanitize color names or hexes
    const sanitizedTags = rawTags.map((t) => ({
      ...t,
      color: t.color ? t.color.trim() : "gray",
    }));

    setStorage(GLOBAL_CATEGORIES_KEY, categories);
    setStorage(GLOBAL_TAGS_KEY, sanitizedTags);

    return {
      success: true,
      message: `Imported ${categories.length} categories and ${sanitizedTags.length} tags successfully!`,
    };
  } catch (err) {
    return { success: false, message: "JSON parse error: " + (err as Error).message };
  }
}

// ── 4. RESOLVER HELPERS FOR COMPONENT UI ───────────────────────────────────

export function getTagConfig(tagName: string, projectId?: string, customColor?: string): TagConfig {
  const cleanName = tagName.trim();
  const lowerName = cleanName.toLowerCase();

  // 1. Check Project Tags
  if (projectId) {
    const projectTags = getProjectTags(projectId);
    const pTag = projectTags.find((t) => t.name.toLowerCase() === lowerName);
    if (pTag) {
      const style = getTagStyle(customColor || pTag.color);
      return {
        id: pTag.id,
        label: pTag.name,
        color: style.color,
        bgSubtle: style.bgSubtle,
        borderSubtle: style.borderSubtle,
      };
    }
  }

  // 2. Check Global Tags
  const globalTags = getGlobalTags();
  const gTag = globalTags.find((t) => t.name.toLowerCase() === lowerName);
  if (gTag) {
    const style = getTagStyle(customColor || gTag.color);
    return {
      id: gTag.id,
      label: gTag.name,
      color: style.color,
      bgSubtle: style.bgSubtle,
      borderSubtle: style.borderSubtle,
    };
  }

  // 3. Fallback for ad-hoc tag names
  const style = getTagStyle(customColor || "gray");
  return {
    id: lowerName,
    label: cleanName,
    color: style.color,
    bgSubtle: style.bgSubtle,
    borderSubtle: style.borderSubtle,
  };
}
