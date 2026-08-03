import { QueryClient } from "@tanstack/react-query";
import { ChecklistItemData, ProjectData, TaskData } from "../types";

// Shared query key for the full board payload — every local cache patch below
// targets this key so small task mutations never refetch the whole board.
export const projectBoardKey = (projectId: string) => ["projects", "board", projectId] as const;

function mapTasks(
  old: ProjectData | undefined,
  mutate: (task: TaskData) => TaskData
): ProjectData | undefined {
  if (!old?.columns) return old;
  return {
    ...old,
    columns: old.columns.map((col) => ({
      ...col,
      tasks: (col.tasks || []).map(mutate),
    })),
  };
}

// Replaces a task with the server response (full payload incl. checklist &
// labels) after an update, move, tag change or attachment change. When the
// response's column_id differs from the column that currently holds the task
// (a move), the task is re-homed: removed from its old column and inserted
// into the target column, preserving position order.
export function patchTaskInBoard(
  queryClient: QueryClient,
  projectId: string,
  updatedTask: TaskData
) {
  queryClient.setQueryData<ProjectData>(projectBoardKey(projectId), (old) => {
    if (!old?.columns) return old;
    const columns = old.columns.map((col) => ({
      ...col,
      tasks: (col.tasks || []).filter((task) => task.id !== updatedTask.id),
    }));
    return {
      ...old,
      columns: columns.map((col) => {
        if (col.id !== updatedTask.column_id) return col;
        const tasks = [...(col.tasks || []), updatedTask].sort(
          (a, b) => a.position - b.position
        );
        return { ...col, tasks };
      }),
    };
  });
}

// The overview payload is derived from the same task rows as the board, so any
// task mutation should refresh it. It is intentionally invalidated (not
// patched) — the endpoint is cheap and re-sorting completed/upcoming lists is
// the server's job.
export function invalidateProjectOverview(queryClient: QueryClient, projectId: string) {
  queryClient.invalidateQueries({ queryKey: ["projects", "overview", projectId] });
}

export function removeTaskFromBoard(
  queryClient: QueryClient,
  projectId: string,
  taskId: string
) {
  queryClient.setQueryData<ProjectData>(projectBoardKey(projectId), (old) => {
    if (!old?.columns) return old;
    return {
      ...old,
      columns: old.columns.map((col) => ({
        ...col,
        tasks: (col.tasks || []).filter((task) => task.id !== taskId),
      })),
    };
  });
}

// Inserts a freshly created task into its column, keeping position order.
export function appendTaskToBoard(
  queryClient: QueryClient,
  projectId: string,
  task: TaskData
) {
  queryClient.setQueryData<ProjectData>(projectBoardKey(projectId), (old) => {
    if (!old?.columns) return old;
    return {
      ...old,
      columns: old.columns.map((col) => {
        if (col.id !== task.column_id) return col;
        const tasks = [...(col.tasks || []), task].sort((a, b) => a.position - b.position);
        return { ...col, tasks };
      }),
    };
  });
}

export function appendChecklistToBoard(
  queryClient: QueryClient,
  projectId: string,
  taskId: string,
  item: ChecklistItemData
) {
  queryClient.setQueryData<ProjectData>(projectBoardKey(projectId), (old) =>
    mapTasks(old, (task) =>
      task.id === taskId
        ? { ...task, checklist_items: [...(task.checklist_items || []), item] }
        : task
    )
  );
}

// Replaces a checklist item by id in whichever task holds it.
export function patchChecklistInBoard(
  queryClient: QueryClient,
  projectId: string,
  item: ChecklistItemData
) {
  queryClient.setQueryData<ProjectData>(projectBoardKey(projectId), (old) =>
    mapTasks(old, (task) => {
      const items = task.checklist_items || [];
      if (!items.some((c) => c.id === item.id)) return task;
      return {
        ...task,
        checklist_items: items.map((c) => (c.id === item.id ? item : c)),
      };
    })
  );
}

export function removeChecklistFromBoard(
  queryClient: QueryClient,
  projectId: string,
  itemId: string
) {
  queryClient.setQueryData<ProjectData>(projectBoardKey(projectId), (old) =>
    mapTasks(old, (task) => {
      const items = task.checklist_items || [];
      if (!items.some((c) => c.id === itemId)) return task;
      return {
        ...task,
        checklist_items: items.filter((c) => c.id !== itemId),
      };
    })
  );
}
