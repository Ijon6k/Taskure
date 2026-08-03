"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CustomTag,
  TagCategory,
  getProjectTags,
  saveProjectTag,
  deleteProjectTag,
  getGlobalCategories,
  getGlobalTags,
} from "@/lib/tags";

/** Loads the label picker options (workspace-global + project-scoped) for a task. */
export function useTaskLabels(projectId: string = "", labels: string[] = [], onChange?: (labels: string[]) => void) {
  const [projectTags, setProjectTags] = useState<CustomTag[]>([]);
  const [globalCategories, setGlobalCategories] = useState<TagCategory[]>([]);
  const [globalTags, setGlobalTags] = useState<CustomTag[]>([]);

  const loadData = useCallback(() => {
    if (projectId) {
      setProjectTags(getProjectTags(projectId));
    }
    setGlobalCategories(getGlobalCategories());
    setGlobalTags(getGlobalTags());
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle label on task ONLY — does NOT insert into Project Tags library
  const toggleLabel = (labelName: string) => {
    const exists = labels.some((l) => l.toLowerCase() === labelName.toLowerCase());
    let updated: string[];
    if (exists) {
      updated = labels.filter((l) => l.toLowerCase() !== labelName.toLowerCase());
    } else {
      updated = [...labels, labelName];
    }

    if (onChange) onChange(updated);
  };

  // Strictly manual "+ Add Tag for this Project" from drawer
  const createProjectTag = (name: string, color: string = "#8A8F98") => {
    const cleanName = name.trim();
    if (!cleanName) return;

    const newTag: CustomTag = {
      id: `ptag-${Date.now()}`,
      name: cleanName,
      color: color || "#8A8F98",
    };

    if (projectId) {
      saveProjectTag(projectId, newTag);
      setProjectTags(getProjectTags(projectId));
    }

    if (!labels.some((l) => l.toLowerCase() === cleanName.toLowerCase())) {
      if (onChange) onChange([...labels, cleanName]);
    }
  };

  const removeProjectTag = (tagId: string, tagName: string) => {
    if (!projectId) return;
    deleteProjectTag(projectId, tagId);
    setProjectTags(getProjectTags(projectId));

    if (labels.some((l) => l.toLowerCase() === tagName.toLowerCase())) {
      if (onChange) onChange(labels.filter((l) => l.toLowerCase() !== tagName.toLowerCase()));
    }
  };

  return {
    projectTags,
    globalCategories,
    globalTags,
    toggleLabel,
    createProjectTag,
    removeProjectTag,
  };
}
