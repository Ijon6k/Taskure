"use client";

import { useState, useEffect } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateProjectModal } from "@/components/project/create-project-modal";

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
    <div className="flex h-screen bg-theme-surface text-theme-primary font-sans select-none overflow-hidden">
      {/* Sidebar */}
      <Sidebar onOpenCreateProject={() => setIsCreateModalOpen(true)} />

      {/* Main Settings Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[672px] px-8 py-16 space-y-10">
            {/* Title */}
            <div>
              <h1 className="text-[24px] font-normal text-theme-primary tracking-tight">
                Settings
              </h1>
            </div>

            {/* Account Section */}
            <div className="space-y-3">
              <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                Account
              </div>
              <div className="py-4 border-b border-theme-default flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-normal text-theme-primary">
                    Developer
                  </div>
                  <div className="text-[12px] font-normal text-theme-secondary">
                    developer@kanban.local
                  </div>
                </div>
                <button
                  onClick={() => alert("Profil lokal single-user untuk MVP.")}
                  className="px-2.5 py-1.5 rounded-[6px] border border-theme-default text-[12px] font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-hover transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Appearance Section */}
            <div className="space-y-6">
              <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
                Appearance
              </div>

              {/* Theme Picker */}
              <div className="py-4 border-b border-theme-default space-y-3">
                <div>
                  <div className="text-[14px] font-normal text-theme-primary">
                    Theme
                  </div>
                  <p className="text-[12px] text-theme-secondary">
                    Choose the surface tone for your workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Dark Card */}
                  <button
                    onClick={() => handleThemeChange("dark")}
                    className={`p-2.5 rounded-[6px] border text-left flex flex-col justify-between h-[86px] transition-colors ${
                      currentTheme === "dark"
                        ? "border-brand-accent bg-theme-elevated"
                        : "border-theme-default hover:border-theme-secondary"
                    }`}
                  >
                    <div className="w-full h-[40px] bg-black rounded-[4px] border border-white/10" />
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[12px] font-medium text-theme-primary">Dark OLED</span>
                      {currentTheme === "dark" && (
                        <Check className="w-[13px] h-[13px] text-brand-accent" />
                      )}
                    </div>
                  </button>

                  {/* Dim Card */}
                  <button
                    onClick={() => handleThemeChange("dim")}
                    className={`p-2.5 rounded-[6px] border text-left flex flex-col justify-between h-[86px] transition-colors ${
                      currentTheme === "dim"
                        ? "border-brand-accent bg-theme-elevated"
                        : "border-theme-default hover:border-theme-secondary"
                    }`}
                  >
                    <div className="w-full h-[40px] bg-[#17171B] rounded-[4px] border border-white/10" />
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[12px] font-medium text-theme-primary">Dim</span>
                      {currentTheme === "dim" && (
                        <Check className="w-[13px] h-[13px] text-brand-accent" />
                      )}
                    </div>
                  </button>

                  {/* Light Card */}
                  <button
                    onClick={() => handleThemeChange("light")}
                    className={`p-2.5 rounded-[6px] border text-left flex flex-col justify-between h-[86px] transition-colors ${
                      currentTheme === "light"
                        ? "border-brand-accent bg-theme-elevated"
                        : "border-theme-default hover:border-theme-secondary"
                    }`}
                  >
                    <div className="w-full h-[40px] bg-white rounded-[4px] border border-black/10" />
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[12px] font-medium text-theme-primary">Light</span>
                      {currentTheme === "light" && (
                        <Check className="w-[13px] h-[13px] text-brand-accent" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div className="py-4 border-b border-theme-default space-y-3">
                <div>
                  <div className="text-[14px] font-normal text-theme-primary">
                    Accent color
                  </div>
                  <p className="text-[12px] text-theme-secondary">
                    Applies to buttons, active navigation, links, progress bars, and focus rings.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {accents.map((acc) => (
                    <button
                      key={acc.hex}
                      onClick={() => setAccentColor(acc.hex)}
                      className={`w-[28px] h-[28px] rounded-full flex items-center justify-center transition-transform ${
                        currentAccent === acc.hex
                          ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: acc.hex }}
                      title={acc.name}
                    >
                      {currentAccent === acc.hex && (
                        <Check className="w-[13px] h-[13px] text-black" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Colors */}
              <div className="py-4 border-b border-white/6 space-y-3">
                <div>
                  <div className="text-[14px] font-normal text-[#F0F0F0]">
                    Status colors
                  </div>
                  <p className="text-[12px] text-[#787878]">
                    Fixed for clarity — they mean the same thing across every theme and accent.
                  </p>
                </div>

                <div className="flex items-center gap-4 text-[12px] text-[#787878]">
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
              <div className="text-[12px] font-medium text-[#787878] uppercase tracking-[0.6px]">
                Workspace
              </div>

              {/* Focus reminders */}
              <div className="py-4 border-b border-white/6 flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-normal text-[#F0F0F0]">
                    Focus reminders
                  </div>
                  <p className="text-[12px] text-[#787878]">
                    Gentle nudges to return to your current focus task.
                  </p>
                </div>

                <button
                  onClick={() => setFocusReminders(!focusReminders)}
                  className={`w-[36px] h-[20px] rounded-full transition-colors relative ${
                    focusReminders ? "bg-[#7F9CF5]" : "bg-[#2A2A2A]"
                  }`}
                >
                  <span
                    className={`w-[16px] h-[16px] bg-white rounded-full absolute top-[2px] transition-all ${
                      focusReminders ? "left-[18px]" : "left-[2px]"
                    }`}
                  />
                </button>
              </div>

              {/* Compact density */}
              <div className="py-4 border-b border-white/6 flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-normal text-[#F0F0F0]">
                    Compact density
                  </div>
                  <p className="text-[12px] text-[#787878]">
                    Reduce spacing across lists and boards.
                  </p>
                </div>

                <button
                  onClick={() => setCompactDensity(!compactDensity)}
                  className={`w-[36px] h-[20px] rounded-full transition-colors relative ${
                    compactDensity ? "bg-[#7F9CF5]" : "bg-[#2A2A2A]"
                  }`}
                >
                  <span
                    className={`w-[16px] h-[16px] bg-white rounded-full absolute top-[2px] transition-all ${
                      compactDensity ? "left-[18px]" : "left-[2px]"
                    }`}
                  />
                </button>
              </div>

              {/* Reduced motion */}
              <div className="py-4 border-b border-white/6 flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-normal text-[#F0F0F0]">
                    Reduced motion
                  </div>
                  <p className="text-[12px] text-[#787878]">
                    Minimize transitions and animated effects.
                  </p>
                </div>

                <button
                  onClick={() => setReducedMotion(!reducedMotion)}
                  className={`w-[36px] h-[20px] rounded-full transition-colors relative ${
                    reducedMotion ? "bg-[#7F9CF5]" : "bg-[#2A2A2A]"
                  }`}
                >
                  <span
                    className={`w-[16px] h-[16px] bg-white rounded-full absolute top-[2px] transition-all ${
                      reducedMotion ? "left-[18px]" : "left-[2px]"
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
