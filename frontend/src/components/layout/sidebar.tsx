"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  Kanban,
  House,
  Keyboard,
  SidebarSimple,
  Gear as SettingsIcon,
  X,
} from "@phosphor-icons/react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";

import { ShortcutsModal } from "@/components/modals/shortcuts-modal";
import { useProjects, useSeedDemo } from "@/lib/api";
import { useUIStore } from "@/store/use-ui-store";
import { useTheme } from "@/components/providers/theme-provider";

interface SidebarProps {
  onOpenCreateProject?: () => void;
}

export function Sidebar({ onOpenCreateProject }: SidebarProps) {
  const pathname = usePathname();
  const { getProjectNavUrl } = useTheme();
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
  const isMobileMenuOpen = useUIStore((s) => s.isMobileMenuOpen);
  const closeMobileMenu = useUIStore((s) => s.closeMobileMenu);

  useHotkeys("n", () => {
    if (onOpenCreateProject) onOpenCreateProject();
    else openCreateProject();
  });
  useHotkeys("shift+?", toggleShortcuts);
  useHotkeys("esc", () => {
    closeShortcuts();
    closeMobileMenu();
  });

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
    { label: "Home", href: "/", icon: House, exact: true },
    { label: "Projects", href: "/projects", icon: Kanban, exact: false },
    { label: "Settings", href: "/settings", icon: SettingsIcon, exact: true },
  ];

  const sidebarContent = (isMobileView: boolean) => (
    <div className="flex flex-col h-full bg-surface-l1 text-theme-primary select-none">
      {/* Sidebar Header */}
      <div
        className={`h-[56px] border-b border-theme-subtle flex items-center shrink-0 ${
          !isMobileView && isSidebarCollapsed ? "justify-center" : "justify-between px-4"
        }`}
      >
        {!isMobileView && isSidebarCollapsed ? (
          <button
            type="button"
            onClick={toggleSidebar}
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
            className="w-[32px] h-[32px] rounded-md flex items-center justify-center hover:bg-theme-hover transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            {isLogoHovered ? (
              <SidebarSimple className="w-[18px] h-[18px] text-theme-primary" />
            ) : (
              <span className="w-[28px] h-[28px] bg-brand-accent rounded-md flex items-center justify-center text-black font-bold text-sm">
                K
              </span>
            )}
          </button>
        ) : (
          <>
            <Link href="/" onClick={() => isMobileView && closeMobileMenu()} className="flex items-center gap-2.5 min-w-0">
              <span className="w-[28px] h-[28px] bg-brand-accent rounded-md flex items-center justify-center text-black font-bold text-sm shrink-0">
                K
              </span>
              <span className="text-[15px] font-medium tracking-tight text-theme-primary whitespace-nowrap">
                My Kanban
              </span>
            </Link>

            {isMobileView ? (
              <button
                type="button"
                onClick={closeMobileMenu}
                className="w-[32px] h-[32px] rounded-md flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-theme-hover transition-colors shrink-0"
                aria-label="Close Mobile Navigation"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-theme-hover transition-colors shrink-0"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <SidebarSimple className="w-[17px] h-[17px]" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav Items */}
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
              onClick={() => isMobileView && closeMobileMenu()}
              title={!isMobileView && isSidebarCollapsed ? item.label : undefined}
              aria-label={!isMobileView && isSidebarCollapsed ? item.label : undefined}
              className={`h-[40px] rounded-md flex items-center text-[14px] font-medium transition-colors ${
                !isMobileView && isSidebarCollapsed ? "w-[40px] justify-center" : "w-full px-3 gap-3"
              } ${
                isActive
                  ? "bg-theme-elevated text-theme-primary font-semibold"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-theme-hover"
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${
                  isActive ? "text-brand-accent" : "text-theme-secondary"
                }`}
              />
              {(isMobileView || !isSidebarCollapsed) && <span>{item.label}</span>}
            </Link>
          );
        })}

        {(isMobileView || !isSidebarCollapsed) && projects.length > 0 && (
          <div className="pt-5 px-3">
            <div className="text-[12px] font-mono text-theme-secondary uppercase tracking-widest mb-2.5">
              Projects ({projects.length})
            </div>
            <div className="space-y-1">
              {projects.slice(0, 8).map((project) => {
                const isProjectActive = pathname.includes(`/projects/${project.id}`);

                return (
                  <Link
                    key={project.id}
                    href={getProjectNavUrl(project.id)}
                    onClick={() => isMobileView && closeMobileMenu()}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] truncate transition-colors ${
                      isProjectActive
                        ? "bg-theme-elevated text-theme-primary font-medium"
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

      {/* Footer Utilities */}
      <div className="p-3 border-t border-theme-default space-y-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (isMobileView) closeMobileMenu();
            openShortcuts();
          }}
          title={!isMobileView && isSidebarCollapsed ? "Shortcuts" : undefined}
          aria-label={!isMobileView && isSidebarCollapsed ? "Shortcuts" : undefined}
          className={`h-[36px] rounded-md flex items-center text-[13px] font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors ${
            !isMobileView && isSidebarCollapsed ? "w-[40px] justify-center" : "w-full px-3 justify-between"
          }`}
        >
          <span className={`flex items-center ${!isMobileView && isSidebarCollapsed ? "" : "gap-2.5"}`}>
            <Keyboard className="w-4 h-4 text-theme-secondary shrink-0" />
            {(isMobileView || !isSidebarCollapsed) && <span>Shortcuts</span>}
          </span>
          {(isMobileView || !isSidebarCollapsed) && (
            <kbd className="px-1.5 py-0.5 bg-theme-elevated border border-white/10 rounded-[4px] text-[10px] font-mono text-brand-accent font-semibold">
              ?
            </kbd>
          )}
        </button>

        <button
          type="button"
          onClick={handleSeed}
          disabled={seedDemoMutation.isPending}
          title={!isMobileView && isSidebarCollapsed ? "Seed Demo Data" : undefined}
          aria-label={!isMobileView && isSidebarCollapsed ? "Seed Demo Data" : undefined}
          className={`h-[36px] rounded-md flex items-center text-[13px] font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors disabled:opacity-50 ${
            !isMobileView && isSidebarCollapsed ? "w-[40px] justify-center" : "w-full px-3 gap-2.5"
          }`}
        >
          <Database className="w-4 h-4 text-theme-secondary shrink-0" />
          {(isMobileView || !isSidebarCollapsed) && (
            <span>{seedDemoMutation.isPending ? "Seeding..." : "Seed Demo Data"}</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile md:flex) */}
      <aside
        className={`hidden md:flex h-screen border-r border-theme-default flex-col shrink-0 z-20 overflow-hidden transition-[width] duration-200 ease-out ${
          isSidebarCollapsed ? "w-[56px]" : "w-[224px]"
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Off-Canvas Drawer Overlay (md:hidden) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex select-none">
          {/* Backdrop */}
          <div
            onClick={closeMobileMenu}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          />

          {/* Slide-out Drawer Panel */}
          <div className="relative w-[280px] max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent(true)}
          </div>
        </div>
      )}

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={closeShortcuts} />
    </>
  );
}
