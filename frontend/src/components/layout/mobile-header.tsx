"use client";

import Link from "next/link";
import { SidebarSimple, Plus, Kanban } from "@phosphor-icons/react";
import { useUIStore } from "@/store/use-ui-store";

interface MobileHeaderProps {
  title?: string;
  onOpenCreateProject?: () => void;
}

export function MobileHeader({ title = "My Kanban", onOpenCreateProject }: MobileHeaderProps) {
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);

  return (
    <header className="h-11 px-3 border-b border-theme-subtle bg-surface-l1 flex items-center justify-between shrink-0 md:hidden z-30 select-none">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMobileMenu}
          className="w-8 h-8 rounded-[6px] flex items-center justify-center text-theme-secondary hover:text-theme-primary active:bg-theme-hover transition-colors -ml-1 cursor-pointer"
          aria-label="Open Navigation Menu"
          title="Open Menu"
        >
          <SidebarSimple className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-1.5 shrink-0" aria-label="Go Home">
          <span className="w-6 h-6 bg-brand-accent rounded-[6px] flex items-center justify-center text-black font-bold text-xs shrink-0 shadow-xs">
            K
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-1 shrink-0 text-xs font-medium text-theme-tertiary">
        <Link
          href="/projects"
          className="px-2.5 py-1 rounded-[6px] text-theme-secondary hover:text-theme-primary hover:bg-surface-hover transition-colors flex items-center gap-1.5"
          title="Browse All Projects"
        >
          <Kanban className="w-3.5 h-3.5" />
          <span>Projects</span>
        </Link>
      </div>
    </header>
  );
}
