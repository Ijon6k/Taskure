"use client";

import { useCallback } from "react";
import type { ThemeMode } from "@kanban/shared";

const THEME_KEY = "kanban-theme";

export function useTheme() {
  const setTheme = useCallback((theme: ThemeMode) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, []);

  const getTheme = useCallback((): ThemeMode => {
    if (typeof window === "undefined") return "dim";
    return (localStorage.getItem(THEME_KEY) as ThemeMode) ?? "dim";
  }, []);

  return { setTheme, getTheme };
}
