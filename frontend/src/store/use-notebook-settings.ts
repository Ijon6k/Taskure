import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Notebook text-size presets, in px (applied to editor + preview). */
export type NotebookTextSize = "sm" | "md" | "lg";

export const NOTEBOOK_TEXT_SIZES: Record<NotebookTextSize, number> = {
  sm: 13,
  md: 15,
  lg: 18,
};

interface NotebookSettingsState {
  textSize: NotebookTextSize;
  setTextSize: (size: NotebookTextSize) => void;
}

/** Persisted editor preferences (text size), shared across notebook pages. */
export const useNotebookSettings = create<NotebookSettingsState>()(
  persist(
    (set) => ({
      textSize: "md",
      setTextSize: (textSize) => set({ textSize }),
    }),
    { name: "taskure-notebook-settings" }
  )
);
