"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  FolderKanban,
  Home,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
} from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";

import { ShortcutsModal } from "@/components/modals/shortcuts-modal";
import { useProjects, useSeedDemo } from "@/lib/api";
import { useUIStore } from "@/store/use-ui-store";

interface SidebarProps {
  onOpenCreateProject?: () => void;
}

export function Sidebar({ onOpenCreateProject }: SidebarProps) {
  const pathname = usePathname();
  const { data: projects = [] } = useProjects();
  const seedDemoMutation = useSeedDemo();
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  const openCreateProject = useUIStore((s) => s.openCreateProject);
  const isShortcutsOpen = useUIStore((s) => s.isShortcutsOpen);
  const openShortcuts = useUIStore((s) => s.openShortcuts);
  const closeShortcuts = useUIStore((s) => s.closeShortcuts);
  const toggleShortcuts = useUIStore((s) => s.toggleShortcuts);
  const isSidebarCollapsed = useUIStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  useHotkeys("n", () => {
    if (onOpenCreateProject) onOpenCreateProject();
    else openCreateProject();
  });
  useHotkeys("shift+?", toggleShortcuts);
  useHotkeys("esc", closeShortcuts);

  const handleSeed = () => {
    toast.info("Seeding demo data...");
    seedDemoMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Demo data seeded successfully!");
        setTimeout(() => window.location.reload(), 600);
      },
      onError: (error) => {
        toast.error(`Failed to seed demo data: ${(error as Error).message}`);
      },
    });
  };

  const navItems = [
    { label: "Home", href: "/", icon: Home, exact: true },
    { label: "Projects", href: "/projects", icon: FolderKanban, exact: false },
    { label: "Settings", href: "/settings", icon: SettingsIcon, exact: true },
  ];

  return (
    <>
      <aside
        className={`h-screen bg-theme-surface border-r border-theme-default flex flex-col shrink-0 text-theme-primary select-none z-20 overflow-hidden transition-[width] duration-200 ease-out ${
          isSidebarCollapsed ? "w-[56px]" : "w-[224px]"
        }`}
      >
        <div
          className={`h-[56px] border-b border-theme-default flex items-center shrink-0 ${
            isSidebarCollapsed ? "justify-center" : "justify-between px-3"
          }`}
        >
          {isSidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              onMouseEnter={() => setIsLogoHovered(true)}
              onMouseLeave={() => setIsLogoHovered(false)}
              className="w-[32px] h-[32px] rounded-[7px] flex items-center justify-center hover:bg-theme-hover transition-colors"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              {isLogoHovered ? (
                <PanelLeftOpen className="w-[18px] h-[18px] text-theme-primary" />
              ) : (
                <span className="w-[28px] h-[28px] bg-brand-accent rounded-[6px] flex items-center justify-center text-black font-bold text-sm">
                  K
                </span>
              )}
            </button>
          ) : (
            <>
              <Link href="/" className="flex items-center gap-2.5 min-w-0">
                <span className="w-[28px] h-[28px] bg-brand-accent rounded-[6px] flex items-center justify-center text-black font-bold text-sm shrink-0">
                  K
                </span>
                <span className="text-[14px] font-medium text-theme-primary whitespace-nowrap">
                  My Kanban
                </span>
              </Link>

              <button
                type="button"
                onClick={toggleSidebar}
                className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-theme-hover transition-colors shrink-0"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-[17px] h-[17px]" />
              </button>
            </>
          )}
        </div>

        <div className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isSidebarCollapsed ? item.label : undefined}
                aria-label={isSidebarCollapsed ? item.label : undefined}
                className={`h-[36px] rounded-[6px] flex items-center text-[14px] font-medium transition-colors ${
                  isSidebarCollapsed ? "w-[40px] justify-center" : "w-full px-2.5 gap-3"
                } ${
                  isActive
                    ? "bg-theme-elevated text-theme-primary"
                    : "text-theme-secondary hover:text-theme-primary hover:bg-theme-hover"
                }`}
              >
                <Icon
                  className={`w-[17px] h-[17px] shrink-0 ${
                    isActive ? "text-theme-primary" : "text-theme-secondary"
                  }`}
                />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {!isSidebarCollapsed && projects.length > 0 && (
            <div className="pt-4 px-2.5">
              <div className="text-[11px] font-medium text-theme-secondary uppercase tracking-wider mb-2">
                Projects ({projects.length})
              </div>
              <div className="space-y-0.5">
                {projects.slice(0, 5).map((project) => {
                  const isProjectActive = pathname.includes(`/projects/${project.id}`);

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}/board`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[13px] truncate transition-colors ${
                        isProjectActive
                          ? "bg-theme-elevated text-theme-primary"
                          : "text-theme-secondary hover:text-theme-primary hover:bg-theme-hover"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: project.color || "#7F9CF5" }}
                      />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-2 border-t border-theme-default space-y-1 shrink-0">
          <button
            type="button"
            onClick={openShortcuts}
            title={isSidebarCollapsed ? "Shortcuts" : undefined}
            aria-label={isSidebarCollapsed ? "Shortcuts" : undefined}
            className={`h-[32px] rounded-[6px] flex items-center text-[12px] font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors ${
              isSidebarCollapsed ? "w-[40px] justify-center" : "w-full px-2.5 justify-between"
            }`}
          >
            <span className={`flex items-center ${isSidebarCollapsed ? "" : "gap-2"}`}>
              <Keyboard className="w-4 h-4 text-theme-secondary shrink-0" />
              {!isSidebarCollapsed && <span>Shortcuts</span>}
            </span>
            {!isSidebarCollapsed && (
              <kbd className="px-1.5 py-0.5 bg-theme-elevated border border-white/10 rounded text-[10px] font-mono text-brand-accent font-semibold">
                ?
              </kbd>
            )}
          </button>

          <button
            type="button"
            onClick={handleSeed}
            disabled={seedDemoMutation.isPending}
            title={isSidebarCollapsed ? "Seed Demo Data" : undefined}
            aria-label={isSidebarCollapsed ? "Seed Demo Data" : undefined}
            className={`h-[34px] rounded-[6px] flex items-center text-[12px] font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors disabled:opacity-50 ${
              isSidebarCollapsed ? "w-[40px] justify-center" : "w-full px-2.5 gap-2.5"
            }`}
          >
            <Database className="w-4 h-4 text-theme-secondary shrink-0" />
            {!isSidebarCollapsed && (
              <span>{seedDemoMutation.isPending ? "Seeding..." : "Seed Demo Data"}</span>
            )}
          </button>
        </div>
      </aside>

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={closeShortcuts} />
    </>
  );
}
