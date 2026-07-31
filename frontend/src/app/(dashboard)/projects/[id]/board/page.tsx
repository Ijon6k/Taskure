"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useProjectBoard, TaskData } from "@/lib/api";
import { KanbanBoardContainer } from "@/features/board/components/kanban-board-container";
import { useUIStore } from "@/store/use-ui-store";

// Lazy load heavy modals and drawers
const TaskDrawer = dynamic(
  () => import("@/components/features/task/task-drawer").then((m) => m.TaskDrawer),
  { ssr: false }
);
const CreateProjectModal = dynamic(
  () => import("@/components/features/project/create-project-modal").then((m) => m.CreateProjectModal),
  { ssr: false }
);
const ImportJsonModal = dynamic(
  () => import("@/components/features/project/import-json-modal").then((m) => m.ImportJsonModal),
  { ssr: false }
);
const ExportJsonModal = dynamic(
  () => import("@/components/features/project/export-json-modal").then((m) => m.ExportJsonModal),
  { ssr: false }
);

export default function ProjectBoardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";

  const { data: project, isLoading: loading, refetch } = useProjectBoard(projectId);

  const isCreateProjectOpen = useUIStore((s) => s.isCreateProjectOpen);
  const closeCreateProject = useUIStore((s) => s.closeCreateProject);
  const isImportJsonOpen = useUIStore((s) => s.isImportJsonOpen);
  const openImportJson = useUIStore((s) => s.openImportJson);
  const closeImportJson = useUIStore((s) => s.closeImportJson);
  const isExportJsonOpen = useUIStore((s) => s.isExportJsonOpen);
  const openExportJson = useUIStore((s) => s.openExportJson);
  const closeExportJson = useUIStore((s) => s.closeExportJson);
  const selectedTaskId = useUIStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useUIStore((s) => s.setSelectedTaskId);

  const handleTaskClick = useCallback((task: TaskData) => {
    setSelectedTaskId(task.id);
  }, [setSelectedTaskId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <KanbanBoardContainer
        projectId={projectId}
        project={project}
        loading={loading}
        onTaskClick={handleTaskClick}
        onRefreshProject={refetch}
        onExportJson={() => project && openExportJson(project)}
        onImportJson={openImportJson}
      />

      {/* Lazy Loaded Task Drawer & Modals */}
      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={refetch}
        />
      )}

      {isCreateProjectOpen && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={closeCreateProject}
          onSuccess={() => refetch()}
        />
      )}

      {isImportJsonOpen && (
        <ImportJsonModal
          isOpen={isImportJsonOpen}
          onClose={closeImportJson}
          onSuccess={() => refetch()}
        />
      )}

      {project && isExportJsonOpen && (
        <ExportJsonModal
          isOpen={isExportJsonOpen}
          project={project}
          onClose={closeExportJson}
        />
      )}
    </div>
  );
}
