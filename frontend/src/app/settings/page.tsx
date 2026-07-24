"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { CreateProjectModal } from "@/components/features/project/create-project-modal";
import { useTheme } from "@/components/providers/theme-provider";

export default function SettingsPage() {
  const { theme: currentTheme, accentColor: currentAccent, setTheme, setAccentColor } = useTheme();
  const [focusReminders, setFocusReminders] = useState(true);
  const [compactDensity, setCompactDensity] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleThemeChange = (t: "dim" | "dark" | "light") => {
    setTheme(t);
  };

  const accents = [
    { name: "Lavender", hex: "#B794F6" },
    { name: "Pastel Blue", hex: "#7F9CF5" },
    { name: "Pastel Green", hex: "#68D391" },
    { name: "Pastel Orange", hex: "#F6AD8A" },
    { name: "Pastel Pink", hex: "#F6A5C0" },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-theme-surface text-theme-primary font-sans select-none overflow-hidden">
      {/* Mobile Top Header */}
      <MobileHeader title="Settings" onOpenCreateProject={() => setIsCreateModalOpen(true)} />

      {/* Sidebar Navigation */}
      <Sidebar onOpenCreateProject={() => setIsCreateModalOpen(true)} />

      {/* Main Settings Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[672px] px-3.5 sm:px-8 py-4 sm:py-10 md:py-12 space-y-6 sm:space-y-10">
            {/* Title */}
            <div>
              <h1 className="text-xl sm:text-2xl font-normal text-theme-primary tracking-tight">
                Settings
              </h1>
            </div>

            {/* Account Section */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                Account
              </div>
              <div className="py-3.5 border-b border-theme-default flex items-center justify-between">
                <div>
                  <div className="text-sm font-normal text-theme-primary">
                    Developer
                  </div>
                  <div className="text-xs font-normal text-theme-secondary">
                    developer@kanban.local
                  </div>
                </div>
                <button
                  onClick={() => alert("Profil lokal single-user untuk MVP.")}
                  className="px-3 py-1.5 rounded-md border border-theme-default text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-hover transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Appearance Section */}
            <div className="space-y-6">
              <div className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                Appearance
              </div>

              {/* Theme Picker */}
              <div className="py-3.5 border-b border-theme-default space-y-3">
                <div>
                  <div className="text-sm font-normal text-theme-primary">
                    Theme
                  </div>
                  <p className="text-xs text-theme-secondary">
                    Choose the surface tone for your workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Dark Card */}
                  <button
                    onClick={() => handleThemeChange("dark")}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between h-24 sm:h-20 transition-colors ${
                      currentTheme === "dark"
                        ? "border-brand-accent bg-theme-elevated"
                        : "border-theme-default hover:border-theme-secondary"
                    }`}
                  >
                    <div className="w-full h-10 bg-black rounded border border-white/10" />
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-medium text-theme-primary">Dark OLED</span>
                      {currentTheme === "dark" && (
                        <Check className="w-3.5 h-3.5 text-brand-accent" />
                      )}
                    </div>
                  </button>

                  {/* Dim Card */}
                  <button
                    onClick={() => handleThemeChange("dim")}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between h-24 sm:h-20 transition-colors ${
                      currentTheme === "dim"
                        ? "border-brand-accent bg-theme-elevated"
                        : "border-theme-default hover:border-theme-secondary"
                    }`}
                  >
                    <div className="w-full h-10 bg-[#17171B] rounded border border-white/10" />
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-medium text-theme-primary">Dim</span>
                      {currentTheme === "dim" && (
                        <Check className="w-3.5 h-3.5 text-brand-accent" />
                      )}
                    </div>
                  </button>

                  {/* Light Card */}
                  <button
                    onClick={() => handleThemeChange("light")}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between h-24 sm:h-20 transition-colors ${
                      currentTheme === "light"
                        ? "border-brand-accent bg-theme-elevated"
                        : "border-theme-default hover:border-theme-secondary"
                    }`}
                  >
                    <div className="w-full h-10 bg-white rounded border border-black/10" />
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-medium text-theme-primary">Light</span>
                      {currentTheme === "light" && (
                        <Check className="w-3.5 h-3.5 text-brand-accent" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div className="py-3.5 border-b border-theme-default space-y-3">
                <div>
                  <div className="text-sm font-normal text-theme-primary">
                    Accent color
                  </div>
                  <p className="text-xs text-theme-secondary">
                    Applies to buttons, active navigation, links, progress bars, and focus rings.
                  </p>
                </div>

                <div className="flex items-center gap-3 py-1 overflow-x-auto">
                  {accents.map((acc) => (
                    <button
                      key={acc.hex}
                      onClick={() => setAccentColor(acc.hex)}
                      className={`w-9 h-9 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-transform shrink-0 ${
                        currentAccent === acc.hex
                          ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: acc.hex }}
                      title={acc.name}
                      aria-label={`Select accent color ${acc.name}`}
                    >
                      {currentAccent === acc.hex && (
                        <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-black" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Colors */}
              <div className="py-3.5 border-b border-theme-default space-y-3">
                <div>
                  <div className="text-sm font-normal text-theme-primary">
                    Status colors
                  </div>
                  <p className="text-xs text-theme-secondary">
                    Fixed for clarity — they mean the same thing across every theme and accent.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-theme-secondary">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#68D391]" />
                    <span>Success</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#F6AD8A]" />
                    <span>Warning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#F6685E]" />
                    <span>Error</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#7F9CF5]" />
                    <span>Info</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Workspace Section */}
            <div className="space-y-4">
              <div className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                Workspace
              </div>

              {/* Focus reminders */}
              <div className="py-3.5 border-b border-theme-default flex items-center justify-between">
                <div>
                  <div className="text-sm font-normal text-theme-primary">
                    Focus reminders
                  </div>
                  <p className="text-xs text-theme-secondary">
                    Gentle nudges to return to your current focus task.
                  </p>
                </div>

                <button
                  onClick={() => setFocusReminders(!focusReminders)}
                  className={`w-11 sm:w-9 h-6 sm:h-5 rounded-full transition-colors relative ${
                    focusReminders ? "bg-brand-accent" : "bg-theme-elevated"
                  }`}
                >
                  <span
                    className={`w-4.5 sm:w-4 h-4.5 sm:h-4 bg-white rounded-full absolute top-[3px] sm:top-[2px] transition-all ${
                      focusReminders ? "left-[23px] sm:left-[18px]" : "left-[3px] sm:left-[2px]"
                    }`}
                  />
                </button>
              </div>

              {/* Compact density */}
              <div className="py-3.5 border-b border-theme-default flex items-center justify-between">
                <div>
                  <div className="text-sm font-normal text-theme-primary">
                    Compact density
                  </div>
                  <p className="text-xs text-theme-secondary">
                    Reduce spacing across lists and boards.
                  </p>
                </div>

                <button
                  onClick={() => setCompactDensity(!compactDensity)}
                  className={`w-11 sm:w-9 h-6 sm:h-5 rounded-full transition-colors relative ${
                    compactDensity ? "bg-brand-accent" : "bg-theme-elevated"
                  }`}
                >
                  <span
                    className={`w-4.5 sm:w-4 h-4.5 sm:h-4 bg-white rounded-full absolute top-[3px] sm:top-[2px] transition-all ${
                      compactDensity ? "left-[23px] sm:left-[18px]" : "left-[3px] sm:left-[2px]"
                    }`}
                  />
                </button>
              </div>

              {/* Reduced motion */}
              <div className="py-3.5 border-b border-theme-default flex items-center justify-between">
                <div>
                  <div className="text-sm font-normal text-theme-primary">
                    Reduced motion
                  </div>
                  <p className="text-xs text-theme-secondary">
                    Minimize transitions and animated effects.
                  </p>
                </div>

                <button
                  onClick={() => setReducedMotion(!reducedMotion)}
                  className={`w-11 sm:w-9 h-6 sm:h-5 rounded-full transition-colors relative ${
                    reducedMotion ? "bg-brand-accent" : "bg-theme-elevated"
                  }`}
                >
                  <span
                    className={`w-4.5 sm:w-4 h-4.5 sm:h-4 bg-white rounded-full absolute top-[3px] sm:top-[2px] transition-all ${
                      reducedMotion ? "left-[23px] sm:left-[18px]" : "left-[3px] sm:left-[2px]"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
