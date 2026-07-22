"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Settings as SettingsIcon, Database } from "lucide-react";
import { useProjects, useSeedDemo } from "@/lib/api";

interface SidebarProps {
  onOpenCreateProject?: () => void;
}

export function Sidebar({ onOpenCreateProject }: SidebarProps) {
  const pathname = usePathname();
  const { data: projects = [] } = useProjects();
  const seedDemoMutation = useSeedDemo();

  const handleSeed = () => {
    seedDemoMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.reload();
      },
      onError: (e) => {
        alert("Gagal melakukan seed demo data: " + (e as Error).message);
      },
    });
  };

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      exact: true,
    },
    {
      label: "Projects",
      href: "/projects",
      icon: FolderKanban,
      exact: false,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: SettingsIcon,
      exact: true,
    },
  ];

  return (
    <aside className="w-[224px] h-screen bg-theme-surface border-r border-theme-default flex flex-col shrink-0 text-theme-primary select-none z-20">
      {/* Workspace Brand Header */}
      <div className="h-[56px] px-3 flex items-center justify-between border-b border-theme-default">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-[28px] h-[28px] bg-brand-accent rounded-[6px] flex items-center justify-center text-black font-bold text-sm">
            K
          </div>
          <span className="text-[14px] font-medium text-theme-primary font-sans">
            My Kanban
          </span>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-[207px] h-[36px] px-2.5 rounded-[6px] flex items-center gap-3 text-[14px] font-medium transition-colors ${
                isActive
                  ? "bg-theme-elevated text-theme-primary"
                  : "text-theme-secondary hover:text-theme-primary hover:bg-theme-hover"
              }`}
            >
              <Icon
                className={`w-[17px] h-[17px] ${
                  isActive ? "text-theme-primary" : "text-theme-secondary"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Quick Project Links Sub-Section */}
        {projects.length > 0 && (
          <div className="pt-4 px-2.5">
            <div className="text-[11px] font-medium text-theme-secondary uppercase tracking-wider mb-2">
              Projek ({projects.length})
            </div>
            <div className="space-y-0.5">
              {projects.slice(0, 5).map((proj) => {
                const isProjectActive = pathname.includes(`/projects/${proj.id}`);
                return (
                  <Link
                    key={proj.id}
                    href={`/projects/${proj.id}/board`}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[13px] truncate transition-colors ${
                      isProjectActive
                        ? "bg-theme-elevated text-theme-primary"
                        : "text-theme-secondary hover:text-theme-primary hover:bg-theme-hover"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color || "#7F9CF5" }}
                    />
                    <span className="truncate">{proj.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Demo Seed Action */}
      <div className="p-2 border-t border-theme-default">
        <button
          onClick={handleSeed}
          disabled={seedDemoMutation.isPending}
          className="w-[207px] h-[36px] px-2.5 rounded-[6px] flex items-center gap-2.5 text-[13px] font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors"
        >
          <Database className="w-[17px] h-[17px] text-theme-secondary" />
          <span>{seedDemoMutation.isPending ? "Seeding..." : "Seed Demo Data"}</span>
        </button>
      </div>
    </aside>
  );
}
