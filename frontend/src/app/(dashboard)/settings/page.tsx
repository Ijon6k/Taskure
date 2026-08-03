"use client";

import { useState } from "react";
import {
  User,
  Layout,
  Palette,
  Sliders,
  FolderKanban,
  Shield,
  RotateCcw,
  Check,
  ChevronRight,
  HardDrive,
  Keyboard,
  Download,
  Upload,
  Kanban,
  FileText,
  Trash2,
} from "lucide-react";
import { CreateProjectModal } from "@/components/features/project/create-project-modal";
import { EditProjectModal } from "@/components/features/project/edit-project-modal";
import { useUIStore } from "@/store/use-ui-store";
import { ImportExportTagsModal } from "@/components/modals/import-export-tags-modal";
import { ImportExportWorkspaceModal } from "@/components/modals/import-export-workspace-modal";
import { ShortcutsModal } from "@/components/modals/shortcuts-modal";
import { GlobalTagsManager } from "@/components/features/settings/global-tags-manager";
import { useTheme } from "@/components/providers/theme-provider";
import { PageContainer } from "@/components/ui/page-container";
import { ThemePreviewCard } from "@/components/features/settings/theme-preview-card";
import { DeleteWorkspaceModal } from "@/components/modals/delete-workspace-modal";
import { useProjects, useSeedDemo } from "@/lib/api";
import { exportFullWorkspaceJSON, deleteAllWorkspaceData } from "@/lib/workspace-backup";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const {
    theme: currentTheme,
    accentColor: currentAccent,
    defaultProjectView,
    setTheme,
    setAccentColor,
    setDefaultProjectView,
  } = useTheme();

  const { data: projects = [] } = useProjects();
  const seedDemoMutation = useSeedDemo();

  const isEditProjectOpen = useUIStore((s) => s.isEditProjectOpen);
  const editingProject = useUIStore((s) => s.editingProject);
  const closeEditProject = useUIStore((s) => s.closeEditProject);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTagsJsonModalOpen, setIsTagsJsonModalOpen] = useState(false);
  const [isWorkspaceBackupModalOpen, setIsWorkspaceBackupModalOpen] = useState(false);
  const [isDeleteWorkspaceModalOpen, setIsDeleteWorkspaceModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const accents = [
    { name: "Pastel Blue", hex: "#7F9CF5" },
    { name: "Lavender", hex: "#B794F6" },
    { name: "Pastel Green", hex: "#68D391" },
    { name: "Pastel Orange", hex: "#F6AD8A" },
    { name: "Pastel Pink", hex: "#F6A5C0" },
  ];

  const handleResetData = () => {
    seedDemoMutation.mutate(undefined, {
      onSuccess: () => toast.success("Workspace reset to demo data!"),
      onError: (err) => toast.error("Failed to reset demo data: " + err.message),
    });
  };

  const handleConfirmDeleteWorkspace = async () => {
    try {
      await deleteAllWorkspaceData();
      await queryClient.invalidateQueries();
      toast.success("All workspace data deleted!");
    } catch (err: any) {
      toast.error("Failed to delete workspace: " + err.message);
    }
  };

  const handleQuickExportWorkspace = async () => {
    try {
      await exportFullWorkspaceJSON();
      toast.success("Workspace backup downloaded!");
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="flex flex-col items-center">
        <PageContainer variant="default" className="!py-10 sm:!py-16 space-y-14 sm:space-y-18">
          {/* Page Header — Editorial Scale & Whitespace */}
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-theme-tertiary uppercase tracking-widest">
              Workspace Personalization
            </p>
            <h1 className="text-[34px] sm:text-[42px] font-normal text-theme-primary tracking-tight leading-none">
              Settings
            </h1>
            <p className="text-[15px] text-theme-secondary leading-relaxed max-w-[620px]">
              Customize your surface theme, default project view, and workspace backup engine.
            </p>
          </div>

          {/* ── 1. PROFILE SECTION ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-theme-subtle">
              <User className="w-4 h-4 text-brand-accent" />
              <h2 className="text-[13px] font-semibold text-theme-tertiary uppercase tracking-wider">
                Profile
              </h2>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-l2 rounded-md hover:bg-surface-hover/50 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-brand-accent/15 flex items-center justify-center text-brand-accent font-semibold text-[16px]">
                  DEV
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-semibold text-theme-primary">Developer</span>
                    <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-surface-l3 text-theme-secondary">
                      Admin
                    </span>
                  </div>
                  <p className="text-[13px] text-theme-secondary mt-0.5">
                    developer@kanban.local · Single-user local workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toast.info("Single-user local profile for Kanban workspace.")}
                className="px-3.5 py-1.5 text-[13px] font-medium text-theme-secondary hover:text-theme-primary bg-surface-l3 hover:bg-surface-l4 rounded-md transition-colors cursor-pointer"
              >
                Profile details
              </button>
            </div>
          </section>

          {/* ── 2. WORKSPACE SECTION ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-theme-subtle">
              <Layout className="w-4 h-4 text-brand-accent" />
              <h2 className="text-[13px] font-semibold text-theme-tertiary uppercase tracking-wider">
                Workspace
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 bg-surface-l2 rounded-md space-y-1">
                <div className="text-[12px] font-mono text-theme-tertiary uppercase">Workspace Name</div>
                <div className="text-[16px] font-semibold text-theme-primary">Taskure</div>
              </div>

              <div className="p-4 bg-surface-l2 rounded-md space-y-1">
                <div className="text-[12px] font-mono text-theme-tertiary uppercase">Active Projects</div>
                <div className="text-[16px] font-semibold text-theme-primary">{projects.length} Projects</div>
              </div>

              <div className="p-4 bg-surface-l2 rounded-md space-y-1">
                <div className="text-[12px] font-mono text-theme-tertiary uppercase">Storage Engine</div>
                <div className="text-[16px] font-semibold text-theme-primary flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-brand-accent" />
                  <span>IndexedDB Local</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── 3. APPEARANCE SECTION ── */}
          <section className="space-y-7">
            <div className="flex items-center gap-2 pb-2 border-b border-theme-subtle">
              <Palette className="w-4 h-4 text-brand-accent" />
              <h2 className="text-[13px] font-semibold text-theme-tertiary uppercase tracking-wider">
                Appearance
              </h2>
            </div>

            {/* Surface Themes */}
            <div className="space-y-3.5">
              <div>
                <h3 className="text-[16px] font-semibold text-theme-primary">Surface Theme</h3>
                <p className="text-[14px] text-theme-secondary mt-0.5">
                  Choose the baseline surface tone. Graphite is the recommended default with a neutral charcoal gray palette.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-1">
                <ThemePreviewCard
                  mode="graphite"
                  title="Graphite"
                  subtitle="Neutral charcoal gray"
                  badge="Recommended"
                  isSelected={currentTheme === "graphite"}
                  onSelect={() => setTheme("graphite")}
                  accentColor={currentAccent}
                />

                <ThemePreviewCard
                  mode="dark"
                  title="OLED Black"
                  subtitle="Pure pitch black"
                  isSelected={currentTheme === "dark"}
                  onSelect={() => setTheme("dark")}
                  accentColor={currentAccent}
                />

                <ThemePreviewCard
                  mode="light"
                  title="Light"
                  subtitle="Warm paper off-white"
                  isSelected={currentTheme === "light"}
                  onSelect={() => setTheme("light")}
                  accentColor={currentAccent}
                />
              </div>
            </div>

            {/* Accent Color Picker */}
            <div className="space-y-3.5 pt-2">
              <div>
                <h3 className="text-[16px] font-semibold text-theme-primary">Accent Color</h3>
                <p className="text-[14px] text-theme-secondary mt-0.5">
                  Applies to buttons, active navigation text, progress bars, and highlights.
                </p>
              </div>

              <div className="flex items-center gap-4 py-3 px-1 overflow-x-auto">
                {accents.map((acc) => {
                  const isSelected = currentAccent.toLowerCase() === acc.hex.toLowerCase();
                  return (
                    <button
                      key={acc.hex}
                      type="button"
                      onClick={() => setAccentColor(acc.hex)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isSelected ? "scale-110" : "hover:scale-105 opacity-75 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: acc.hex,
                        boxShadow: isSelected ? `0 0 0 2px var(--surface-l0), 0 0 0 4px ${acc.hex}` : undefined,
                      }}
                      title={acc.name}
                      aria-label={`Select accent color ${acc.name}`}
                    >
                      {isSelected && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── 4. PRODUCTIVITY & PREFERENCES SECTION ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-theme-subtle">
              <Sliders className="w-4 h-4 text-brand-accent" />
              <h2 className="text-[13px] font-semibold text-theme-tertiary uppercase tracking-wider">
                Preferences
              </h2>
            </div>

            <div className="space-y-3">
              {/* Default Project Target View */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface-l2 rounded-md">
                <div>
                  <div className="text-[15px] font-semibold text-theme-primary">Default Project View</div>
                  <p className="text-[13px] text-theme-secondary mt-0.5">
                    Choose which view opens when clicking a project in navigation or dashboard.
                  </p>
                </div>

                <div className="flex bg-surface-l3 p-1 rounded-md shrink-0 border border-theme-subtle">
                  <button
                    type="button"
                    onClick={() => setDefaultProjectView("board")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all cursor-pointer ${
                      defaultProjectView === "board"
                        ? "bg-brand-accent text-slate-950 shadow-xs"
                        : "text-theme-secondary hover:text-theme-primary"
                    }`}
                  >
                    <Kanban className="w-3.5 h-3.5" />
                    <span>Kanban Board</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDefaultProjectView("overview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all cursor-pointer ${
                      defaultProjectView === "overview"
                        ? "bg-brand-accent text-slate-950 shadow-xs"
                        : "text-theme-secondary hover:text-theme-primary"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Project Overview</span>
                  </button>
                </div>
              </div>

              {/* Keyboard Shortcuts Trigger Link */}
              <div
                onClick={() => setIsShortcutsModalOpen(true)}
                className="flex items-center justify-between p-4 bg-surface-l2 hover:bg-surface-hover rounded-md transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Keyboard className="w-4 h-4 text-brand-accent" />
                  <div>
                    <div className="text-[15px] font-semibold text-theme-primary">Keyboard shortcuts guide</div>
                    <p className="text-[13px] text-theme-secondary mt-0.5">View fast navigation hotkeys.</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-theme-tertiary group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </section>

          {/* ── 5. FULL WORKSPACE BACKUP SECTION ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-theme-subtle">
              <HardDrive className="w-4 h-4 text-brand-accent" />
              <h2 className="text-[13px] font-semibold text-theme-tertiary uppercase tracking-wider">
                Full Workspace Backup
              </h2>
            </div>

            <div className="p-4 bg-surface-l2 rounded-md space-y-4">
              <div>
                <div className="text-[15px] font-semibold text-theme-primary">Export & Restore Workspace JSON</div>
                <p className="text-[13px] text-theme-secondary mt-0.5">
                  Backup all projects, columns, task cards, descriptions, checklists, and global tags in a single portable JSON file.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleQuickExportWorkspace}
                  className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-slate-950 font-semibold text-[13px] rounded-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Full Workspace (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWorkspaceBackupModalOpen(true)}
                  className="px-4 py-2 bg-surface-l3 hover:bg-surface-l4 text-theme-primary font-medium text-[13px] rounded-md flex items-center gap-2 border border-theme-subtle transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-brand-accent" />
                  <span>Restore Workspace Backup</span>
                </button>
              </div>
            </div>
          </section>

          {/* ── 6. WORKSPACE TAG LIBRARY SECTION ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-theme-subtle">
              <FolderKanban className="w-4 h-4 text-brand-accent" />
              <h2 className="text-[13px] font-semibold text-theme-tertiary uppercase tracking-wider">
                Workspace Tag Library
              </h2>
            </div>

            <GlobalTagsManager onOpenJsonModal={() => setIsTagsJsonModalOpen(true)} />
          </section>

          {/* ── 7. ADVANCED & DIAGNOSTICS SECTION ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-theme-subtle">
              <Shield className="w-4 h-4 text-brand-accent" />
              <h2 className="text-[13px] font-semibold text-theme-tertiary uppercase tracking-wider">
                Advanced & Diagnostics
              </h2>
            </div>

            <div className="space-y-3">
              {/* Reset Demo Data */}
              <div className="flex items-center justify-between p-4 bg-surface-l2 rounded-md">
                <div>
                  <div className="text-[15px] font-semibold text-theme-primary">Reset workspace to demo state</div>
                  <p className="text-[13px] text-theme-secondary mt-0.5">
                    Restore default demo projects, columns, tasks, and tags.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetData}
                  disabled={seedDemoMutation.isPending}
                  className="px-4 py-2 bg-surface-l3 hover:bg-surface-l4 text-theme-primary text-[13px] font-medium rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-brand-accent" />
                  <span>{seedDemoMutation.isPending ? "Resetting..." : "Reset Data"}</span>
                </button>
              </div>

              {/* Permanent Delete Workspace Data */}
              <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/15 rounded-md">
                <div>
                  <div className="text-[15px] font-semibold text-red-400">Delete all workspace data</div>
                  <p className="text-[13px] text-theme-secondary mt-0.5">
                    Permanently wipe all projects, columns, task cards, and custom tags.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteWorkspaceModalOpen(true)}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[13px] font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Delete All Data</span>
                </button>
              </div>
            </div>
          </section>
        </PageContainer>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {}}
      />

      <ImportExportTagsModal
        isOpen={isTagsJsonModalOpen}
        onClose={() => setIsTagsJsonModalOpen(false)}
        onSuccess={() => {}}
      />

      <ImportExportWorkspaceModal
        isOpen={isWorkspaceBackupModalOpen}
        onClose={() => setIsWorkspaceBackupModalOpen(false)}
      />

      <DeleteWorkspaceModal
        isOpen={isDeleteWorkspaceModalOpen}
        onClose={() => setIsDeleteWorkspaceModalOpen(false)}
        onConfirmDelete={handleConfirmDeleteWorkspace}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <EditProjectModal
        isOpen={isEditProjectOpen}
        project={editingProject}
        onClose={closeEditProject}
      />
    </main>
  );
}
