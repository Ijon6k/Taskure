"use client";

import { useTheme as useThemeFromProvider } from "@/components/providers/theme-provider";

export function useTheme() {
  const { theme, accentColor, setTheme, setAccentColor } = useThemeFromProvider();
  return { theme, accentColor, setTheme, setAccentColor };
}
