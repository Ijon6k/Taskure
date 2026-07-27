"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "graphite" | "dark" | "light";
export type ProjectViewMode = "board" | "overview";

interface ThemeContextType {
  theme: ThemeMode;
  accentColor: string;
  defaultProjectView: ProjectViewMode;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (accent: string) => void;
  setDefaultProjectView: (view: ProjectViewMode) => void;
  getProjectNavUrl: (projectId: string) => string;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "graphite",
  accentColor: "#7F9CF5",
  defaultProjectView: "board",
  setTheme: () => {},
  setAccentColor: () => {},
  setDefaultProjectView: () => {},
  getProjectNavUrl: (id) => `/projects/${id}/board`,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("graphite");
  const [accentColor, setAccentColorState] = useState<string>("#7F9CF5");
  const [defaultProjectView, setDefaultProjectViewState] = useState<ProjectViewMode>("board");

  useEffect(() => {
    // Restore Theme (Default to "graphite")
    const savedTheme = localStorage.getItem("kanban_theme");
    let initialTheme: ThemeMode = "graphite";

    if (savedTheme === "dark" || savedTheme === "oled") {
      initialTheme = "dark";
    } else if (savedTheme === "light") {
      initialTheme = "light";
    } else {
      initialTheme = "graphite"; // Default Graphite charcoal gray
    }

    setThemeState(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);

    // Restore Accent (Default to Pastel Blue #7F9CF5)
    const savedAccent = localStorage.getItem("kanban_accent");
    const initialAccent = savedAccent || "#7F9CF5";
    setAccentColorState(initialAccent);
    document.documentElement.style.setProperty("--brand-accent", initialAccent);

    // Restore Default Project View
    const savedView = localStorage.getItem("kanban_default_project_view");
    if (savedView === "overview") {
      setDefaultProjectViewState("overview");
    } else {
      setDefaultProjectViewState("board");
    }
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem("kanban_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const setAccentColor = (newAccent: string) => {
    setAccentColorState(newAccent);
    localStorage.setItem("kanban_accent", newAccent);
    document.documentElement.style.setProperty("--brand-accent", newAccent);
  };

  const setDefaultProjectView = (newView: ProjectViewMode) => {
    setDefaultProjectViewState(newView);
    localStorage.setItem("kanban_default_project_view", newView);
  };

  const getProjectNavUrl = (projectId: string) => {
    return defaultProjectView === "overview"
      ? `/projects/${projectId}`
      : `/projects/${projectId}/board`;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accentColor,
        defaultProjectView,
        setTheme,
        setAccentColor,
        setDefaultProjectView,
        getProjectNavUrl,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
