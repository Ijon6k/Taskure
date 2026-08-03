"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useProjectBoard, TaskData } from "@/lib/api";
import { patchTaskInBoard, invalidateProjectOverview } from "@/lib/api/queries/task-cache";
import { KanbanBoardContainer } from "@/features/board/components/kanban-board-container";
import { BoardImportPreview } from "@/components/features/kanban/board-import-preview";
import { useUIStore } from "@/store/use-ui-store";
import { applyImportReplace, buildReplaceDiff, ImportDiff, ParsedImport } from "@/lib/workspace-backup";
import { toast } from "sonner";

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

interface ImportPreviewState {
  parsed: ParsedImport;
  diff: ImportDiff;
}

/** Board page: loads the board query, wires drag-and-drop onTaskMoved and hosts the drawer + modals. */
export default function ProjectBoardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";

  const { data: project, isLoading: loading, refetch } = useProjectBoard(projectId);
  const queryClient = useQueryClient();
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [isApplying, setIsApplying] = useState(false);

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

  // Drag-drop moves are patched into the query cache from the server response
  // instead of refetching the full board payload.
  const handleTaskMoved = useCallback(
    (updated: TaskData) => {
      patchTaskInBoard(queryClient, projectId, updated);
      invalidateProjectOverview(queryClient, projectId);
    },
    [queryClient, projectId]
  );

  // Replace-mode import: parse the JSON, close the modal, and let the user
  // review an in-place board diff before anything is mutated.
  const handleImportReady = useCallback(
    (parsed: ParsedImport) => {
      if (!project) return;
      setImportPreview({ parsed, diff: buildReplaceDiff(project, parsed) });
    },
    [project]
  );

  const handleApplyImport = useCallback(async () => {
    if (!project || !importPreview || isApplying) return;
    setIsApplying(true);
    try {
      const result = await applyImportReplace(project.id, importPreview.parsed);
      toast.success(
        `Board updated: +${result.columnsAdded} columns, +${result.tasksAdded} tasks, −${result.tasksRemoved} removed.`
      );
      setImportPreview(null);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply import.");
    } finally {
      setIsApplying(false);
    }
  }, [project, importPreview, isApplying, refetch]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {importPreview && project ? (
        <BoardImportPreview
          project={project}
          diff={importPreview.diff}
          isApplying={isApplying}
          onApply={handleApplyImport}
          onCancel={() => setImportPreview(null)}
          onEditJson={openImportJson}
        />
      ) : (
        <KanbanBoardContainer
          projectId={projectId}
          project={project}
          loading={loading}
          onTaskClick={handleTaskClick}
          onRefreshProject={refetch}
          onTaskMoved={handleTaskMoved}
          onExportJson={() => project && openExportJson(project)}
          onImportJson={openImportJson}
        />
      )}

      {/* Lazy Loaded Task Drawer & Modals */}
      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {isCreateProjectOpen && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={closeCreateProject}
          onSuccess={() => refetch()}
        />
      )}

      <ImportJsonModal
        isOpen={isImportJsonOpen}
        onClose={closeImportJson}
        mode="replace"
        project={project ?? null}
        onReady={handleImportReady}
      />

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
