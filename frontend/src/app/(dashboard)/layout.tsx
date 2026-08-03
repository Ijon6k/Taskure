"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { useUIStore } from "@/store/use-ui-store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const openCreateProject = useUIStore((s) => s.openCreateProject);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-surface-l0 text-theme-primary font-sans select-none overflow-hidden">
      <MobileHeader title="Taskure" onOpenCreateProject={openCreateProject} />
      <Sidebar onOpenCreateProject={openCreateProject} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {children}
      </div>
    </div>
  );
}
