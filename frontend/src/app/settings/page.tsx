"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { CreateProjectModal } from "@/components/features/project/create-project-modal";
import { ImportExportTagsModal } from "@/components/modals/import-export-tags-modal";
import { GlobalTagsManager } from "@/components/features/settings/global-tags-manager";
import { useTheme } from "@/components/providers/theme-provider";
import { PageContainer } from "@/components/ui/page-container";

export default function SettingsPage() {
  const { theme: currentTheme, accentColor: currentAccent, setTheme, setAccentColor } = useTheme();
  const [focusReminders, setFocusReminders] = useState(true);
  const [compactDensity, setCompactDensity] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTagsJsonModalOpen, setIsTagsJsonModalOpen] = useState(false);

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
    <div className="flex flex-col md:flex-row h-screen bg-surface-l0 text-theme-primary font-sans select-none overflow-hidden">
      {/* Mobile Top Header */}
      <MobileHeader title="Settings" onOpenCreateProject={() => setIsCreateModalOpen(true)} />

      {/* Sidebar Navigation */}
      <Sidebar onOpenCreateProject={() => setIsCreateModalOpen(true)} />

      {/* Main Settings Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center">
          <PageContainer variant="default">
            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-normal text-theme-primary tracking-tight">
                Settings
              </h1>
            </div>

            {/* Account Section */}
            <div className="space-y-2">
              <p className="section-title">Account</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] text-theme-primary">Developer</div>
                  <div className="text-[13px] text-theme-tertiary">developer@kanban.local</div>
                </div>
                <button
                  onClick={() => alert("Single-user local profile for Kanban workspace.")}
                  className="px-3 py-1.5 text-[12px] font-medium text-theme-secondary hover:text-theme-primary hover:bg-surface-hover rounded-md transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>

            <hr className="section-divider" />

            {/* Appearance Section */}
            <div className="space-y-6">
              <p className="section-title">Appearance</p>

              {/* Theme Picker */}
              <div className="space-y-3">
                <div>
                  <div className="text-[15px] text-theme-primary">Theme</div>
                  <p className="text-[13px] text-theme-tertiary">
                    Choose the surface tone for your workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Dark OLED */}
                  <button
                    onClick={() => handleThemeChange("dark")}
                    className={`p-3 rounded-[8px] border text-left flex flex-col justify-between h-24 sm:h-20 transition-colors ${
                      currentTheme === "dark"
                        ? "border-brand-accent bg-surface-hover"
                        : "border-theme-subtle hover:border-theme-default"
                    }`}
                  >
                    <div className="w-full h-10 bg-black rounded-[6px] border border-white/10" />
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-medium text-theme-primary">Dark OLED</span>
                      {currentTheme === "dark" && (
                        <Check className="w-3.5 h-3.5 text-brand-accent" />
                      )}
                    </div>
                  </button>

                  {/* Dim */}
                  <button
                    onClick={() => handleThemeChange("dim")}
                    className={`p-3 rounded-[8px] border text-left flex flex-col justify-between h-24 sm:h-20 transition-colors ${
                      currentTheme === "dim"
                        ? "border-brand-accent bg-surface-hover"
                        : "border-theme-subtle hover:border-theme-default"
                    }`}
                  >
                    <div className="w-full h-10 bg-[#0e1015] rounded-[6px] border border-white/10" />
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-medium text-theme-primary">Dim</span>
                      {currentTheme === "dim" && (
                        <Check className="w-3.5 h-3.5 text-brand-accent" />
                      )}
                    </div>
                  </button>

                  {/* Light */}
                  <button
                    onClick={() => handleThemeChange("light")}
                    className={`p-3 rounded-[8px] border text-left flex flex-col justify-between h-24 sm:h-20 transition-colors ${
                      currentTheme === "light"
                        ? "border-brand-accent bg-surface-hover"
                        : "border-theme-subtle hover:border-theme-default"
                    }`}
                  >
                    <div className="w-full h-10 bg-white rounded-[6px] border border-black/10" />
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
              <div className="space-y-3">
                <div>
                  <div className="text-[15px] text-theme-primary">Accent color</div>
                  <p className="text-[13px] text-theme-tertiary">
                    Applies to buttons, navigation, links, progress bars, and focus rings.
                  </p>
                </div>

                <div className="flex items-center gap-3 py-1 overflow-x-auto">
                  {accents.map((acc) => (
                    <button
                      key={acc.hex}
                      onClick={() => setAccentColor(acc.hex)}
                      className={`w-9 h-9 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-transform shrink-0 ${
                        currentAccent === acc.hex
                          ? "ring-2 ring-offset-2 ring-brand-accent ring-offset-surface-l0 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: acc.hex }}
                      title={acc.name}
                      aria-label={`Select accent color ${acc.name}`}
                    >
                      {currentAccent === acc.hex && (
                        <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <hr className="section-divider" />

            {/* Global Tag Templates */}
            <GlobalTagsManager onOpenJsonModal={() => setIsTagsJsonModalOpen(true)} />

            <hr className="section-divider" />

            {/* Workspace Options */}
            <div className="space-y-3">
              <p className="section-title">Workspace</p>

              {/* Focus reminders */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] text-theme-primary">Focus reminders</div>
                  <p className="text-[13px] text-theme-tertiary">
                    Gentle nudges to return to your current focus task.
                  </p>
                </div>
                <button
                  onClick={() => setFocusReminders(!focusReminders)}
                  className={`w-11 sm:w-9 h-6 sm:h-5 rounded-full transition-colors relative ${
                    focusReminders ? "bg-brand-accent" : "bg-surface-l3"
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
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] text-theme-primary">Compact density</div>
                  <p className="text-[13px] text-theme-tertiary">
                    Reduce spacing across lists and boards.
                  </p>
                </div>
                <button
                  onClick={() => setCompactDensity(!compactDensity)}
                  className={`w-11 sm:w-9 h-6 sm:h-5 rounded-full transition-colors relative ${
                    compactDensity ? "bg-brand-accent" : "bg-surface-l3"
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
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] text-theme-primary">Reduced motion</div>
                  <p className="text-[13px] text-theme-tertiary">
                    Minimize transitions and animated effects.
                  </p>
                </div>
                <button
                  onClick={() => setReducedMotion(!reducedMotion)}
                  className={`w-11 sm:w-9 h-6 sm:h-5 rounded-full transition-colors relative ${
                    reducedMotion ? "bg-brand-accent" : "bg-surface-l3"
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
          </PageContainer>
        </div>
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Import/Export Tag Templates Modal */}
      <ImportExportTagsModal
        isOpen={isTagsJsonModalOpen}
        onClose={() => setIsTagsJsonModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
