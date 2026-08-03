"use client";

import { useState, useMemo, useCallback } from "react";
import { ProjectData, TaskData } from "@/lib/api";
import { KanbanBoard } from "@/components/features/kanban/kanban-board";
import { BoardFilterToolbar } from "@/components/features/kanban/board-filter-toolbar";
import { BoardFilterState, DEFAULT_BOARD_FILTERS, filterAndSortTasks } from "@/lib/filter-tasks";
import { extractTaskTags } from "@/lib/tags";

interface KanbanBoardContainerProps {
  projectId: string;
  project?: ProjectData | null | undefined;
  loading: boolean;
  onTaskClick: (task: TaskData) => void;
  onRefreshProject: () => void;
  onTaskMoved?: ((updated: TaskData) => void) | undefined;
  onExportJson?: (() => void) | undefined;
  onImportJson?: (() => void) | undefined;
}

/** Bridges board data + DnD hook into the presentational KanbanBoard. */
export function KanbanBoardContainer({
  projectId,
  project,
  loading,
  onTaskClick,
  onRefreshProject,
  onTaskMoved,
  onExportJson,
  onImportJson,
}: KanbanBoardContainerProps) {
  const [boardFilters, setBoardFilters] = useState<BoardFilterState>(DEFAULT_BOARD_FILTERS);

  // Extract all unique tags in the project
  const allTags = useMemo(() => {
    if (!project?.columns) return [];
    return Array.from(
      new Set(
        project.columns
          .flatMap((c) => c.tasks || [])
          .flatMap((t) => extractTaskTags(t))
      )
    ).filter(Boolean);
  }, [project?.columns]);

  // Apply multi-dimensional filters and sorting to column tasks
  const filteredColumns = useMemo(() => {
    if (!project?.columns) return [];
    return project.columns.map((col) => {
      const rawTasks = col.tasks || [];
      const filtered = filterAndSortTasks(rawTasks, boardFilters);
      return {
        ...col,
        tasks: filtered,
      };
    });
  }, [project?.columns, boardFilters]);

  return (
    <>
      <BoardFilterToolbar
        filters={boardFilters}
        onChangeFilters={setBoardFilters}
        boardTags={allTags}
        onExportJson={onExportJson}
        onImportJson={onImportJson}
      />

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex gap-4 animate-pulse h-full items-start p-4 md:p-6">
            <div className="w-[280px] h-96 bg-theme-surface rounded-md" />
            <div className="w-[280px] h-96 bg-theme-surface rounded-md" />
            <div className="w-[280px] h-96 bg-theme-surface rounded-md" />
          </div>
        ) : (
          <KanbanBoard
            projectId={projectId}
            columns={filteredColumns}
            onTaskClick={onTaskClick}
            onRefreshProject={onRefreshProject}
            onTaskMoved={onTaskMoved}
          />
        )}
      </div>
    </>
  );
}
