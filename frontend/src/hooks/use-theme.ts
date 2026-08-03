"use client";

import { useTheme as useThemeFromProvider } from "@/components/providers/theme-provider";

/** Returns the theme context (mode + accent) for the app shell. */
export function useTheme() {
  const { theme, accentColor, setTheme, setAccentColor } = useThemeFromProvider();
  return { theme, accentColor, setTheme, setAccentColor };
}
