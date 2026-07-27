"use client";

import Link from "next/link";
import { PanelLeft, Plus, FolderKanban } from "lucide-react";
import { useUIStore } from "@/store/use-ui-store";

interface MobileHeaderProps {
  title?: string;
  onOpenCreateProject?: () => void;
}

export function MobileHeader({ title = "My Kanban", onOpenCreateProject }: MobileHeaderProps) {
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
  const openCreateProject = useUIStore((s) => s.openCreateProject);

  const handleCreate = () => {
    if (onOpenCreateProject) onOpenCreateProject();
    else openCreateProject();
  };

  return (
    <header className="h-12 px-3 sm:px-4 border-b border-theme-default bg-theme-surface flex items-center justify-between shrink-0 md:hidden z-30 select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={toggleMobileMenu}
          className="w-9 h-9 rounded-[6px] flex items-center justify-center text-theme-secondary hover:text-theme-primary active:bg-theme-hover transition-colors -ml-1"
          aria-label="Open Workspace Navigation Menu"
          title="Open Menu"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-2 min-w-0 truncate">
          <span className="w-6 h-6 bg-brand-accent rounded-[6px] flex items-center justify-center text-black font-bold text-xs shrink-0 shadow-sm">
            K
          </span>
          <span className="text-[15px] font-semibold text-theme-primary truncate tracking-tight">
            {title}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href="/projects"
          className="w-9 h-9 rounded-[6px] flex items-center justify-center text-theme-secondary hover:text-theme-primary active:bg-theme-hover transition-colors"
          title="Browse Projects"
          aria-label="Browse Projects"
        >
          <FolderKanban className="w-4 h-4" />
        </Link>

        <button
          type="button"
          onClick={handleCreate}
          className="h-8 px-3 bg-brand-accent hover:opacity-90 active:scale-95 text-black text-xs font-semibold rounded-[8px] flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>
    </header>
  );
}
