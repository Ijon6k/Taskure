import { create } from "zustand";
import { ProjectData } from "@/lib/api";

interface UIStoreState {
  // Create Project Modal
  isCreateProjectOpen: boolean;
  openCreateProject: () => void;
  closeCreateProject: () => void;

  // Edit Project Modal
  isEditProjectOpen: boolean;
  editingProject: ProjectData | null;
  openEditProject: (project: ProjectData) => void;
  closeEditProject: () => void;

  // Import JSON Modal
  isImportJsonOpen: boolean;
  openImportJson: () => void;
  closeImportJson: () => void;

  // Export JSON Modal
  isExportJsonOpen: boolean;
  exportingProject: ProjectData | null;
  openExportJson: (project: ProjectData) => void;
  closeExportJson: () => void;

  // Shortcuts Guide Modal
  isShortcutsOpen: boolean;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  toggleShortcuts: () => void;

  // Selected Task Drawer
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Active Board Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
  resetFilters: () => void;

  // Sidebar
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  // Create Project
  isCreateProjectOpen: false,
  openCreateProject: () => set({ isCreateProjectOpen: true }),
  closeCreateProject: () => set({ isCreateProjectOpen: false }),

  // Edit Project
  isEditProjectOpen: false,
  editingProject: null,
  openEditProject: (project) => set({ isEditProjectOpen: true, editingProject: project }),
  closeEditProject: () => set({ isEditProjectOpen: false, editingProject: null }),

  // Import JSON
  isImportJsonOpen: false,
  openImportJson: () => set({ isImportJsonOpen: true }),
  closeImportJson: () => set({ isImportJsonOpen: false }),

  // Export JSON
  isExportJsonOpen: false,
  exportingProject: null,
  openExportJson: (project) => set({ isExportJsonOpen: true, exportingProject: project }),
  closeExportJson: () => set({ isExportJsonOpen: false, exportingProject: null }),

  // Shortcuts Guide
  isShortcutsOpen: false,
  openShortcuts: () => set({ isShortcutsOpen: true }),
  closeShortcuts: () => set({ isShortcutsOpen: false }),
  toggleShortcuts: () => set((state) => ({ isShortcutsOpen: !state.isShortcutsOpen })),

  // Selected Task Drawer
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  // Active Board Filters
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedTag: "all",
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  resetFilters: () => set({ searchQuery: "", selectedTag: "all" }),

  // Sidebar
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));
