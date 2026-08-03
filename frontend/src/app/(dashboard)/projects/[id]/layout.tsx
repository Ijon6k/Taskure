"use client";

import { useParams } from "next/navigation";
import { useProject } from "@/lib/api";
import { useUIStore } from "@/store/use-ui-store";
import { ProjectSubHeader } from "./components/project-sub-header";
import dynamic from "next/dynamic";

const EditProjectModal = dynamic(
  () => import("@/components/features/project/edit-project-modal").then((m) => m.EditProjectModal),
  { ssr: false }
);

export default function ProjectSubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";

  // Light payload: metadata + settings + columns with task counts. The heavy
  // board payload (tasks + checklists) is fetched only by the pages that
  // render tasks (board, overview, resources).
  const { data: project, refetch } = useProject(projectId);
  const isEditProjectOpen = useUIStore((s) => s.isEditProjectOpen);
  const openEditProject = useUIStore((s) => s.openEditProject);
  const closeEditProject = useUIStore((s) => s.closeEditProject);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Modular Sub-Header */}
      <ProjectSubHeader
        projectId={projectId}
        project={project}
        onOpenEditProject={openEditProject}
      />

      {/* Sub-Route View Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {project && isEditProjectOpen && (
        <EditProjectModal
          isOpen={isEditProjectOpen}
          project={project}
          onClose={closeEditProject}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
