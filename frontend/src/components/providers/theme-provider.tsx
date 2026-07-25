"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "dim" | "light";

interface ThemeContextType {
  theme: ThemeMode;
  accentColor: string;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (accent: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  accentColor: "#7F9CF5",
  setTheme: () => { },
  setAccentColor: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [accentColor, setAccentColorState] = useState<string>("#7F9CF5");

  useEffect(() => {
    // Restore Theme
    const savedTheme = localStorage.getItem("kanban_theme") as ThemeMode | null;
    const initialTheme: ThemeMode = savedTheme && ["dark", "dim", "light"].includes(savedTheme) ? savedTheme : "dark";
    setThemeState(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);

    // Restore Accent
    const savedAccent = localStorage.getItem("kanban_accent");
    const initialAccent = savedAccent || "#7F9CF5";
    setAccentColorState(initialAccent);
    document.documentElement.style.setProperty("--brand-accent", initialAccent);
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

  return (
    <ThemeContext.Provider value={{ theme, accentColor, setTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
