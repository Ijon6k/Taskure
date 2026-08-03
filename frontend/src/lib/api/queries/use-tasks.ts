import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksService } from "../services/tasks.service";
import { columnsService } from "../services/columns.service";
import { PROJECT_KEYS } from "./use-projects";
import { invalidateFocusQueries } from "./use-workspace";
import {
  appendChecklistToBoard,
  appendTaskToBoard,
  invalidateProjectOverview,
  patchChecklistInBoard,
  patchTaskInBoard,
  projectBoardKey,
  removeTaskFromBoard,
} from "./task-cache";
import { CreateTaskInput, MoveTaskInput, CreateColumnInput, TaskData, ChecklistItemData, ProjectData } from "../types";

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) => tasksService.createTask(projectId, data),
    onSuccess: (task: TaskData) => {
      appendTaskToBoard(queryClient, projectId, task);
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
      invalidateProjectOverview(queryClient, projectId);
      invalidateFocusQueries(queryClient);
    },
  });
}

export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();
  const boardKey = projectBoardKey(projectId);
  const detailKey = PROJECT_KEYS.detail(projectId);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MoveTaskInput }) =>
      tasksService.moveTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previousBoard = queryClient.getQueryData<ProjectData>(boardKey);
      const previousDetail = queryClient.getQueryData<ProjectData>(detailKey);

      const updateProjectData = (old: ProjectData | undefined) => {
        if (!old?.columns) return old;
        let taskToMove: TaskData | undefined;
        const sourceColumns = old.columns.map(col => {
          const remaining = (col.tasks || []).filter(t => {
            if (t.id === id) {
              taskToMove = t;
              return false;
            }
            return true;
          });
          return { ...col, tasks: remaining };
        });

        if (!taskToMove) return old;

        const nextStatus = (data.status as "todo" | "in_progress" | "done" | undefined) || taskToMove.status;
        const updatedTask: TaskData = { ...taskToMove, column_id: data.column_id, position: data.position, status: nextStatus };

        const targetColumns = sourceColumns.map(col => {
          if (col.id === data.column_id) {
            const tasks = [...(col.tasks || []), updatedTask].sort((a, b) => a.position - b.position);
            return { ...col, tasks };
          }
          return col;
        });

        return { ...old, columns: targetColumns };
      };

      queryClient.setQueryData<ProjectData>(boardKey, updateProjectData);
      queryClient.setQueryData<ProjectData>(detailKey, updateProjectData);

      return { previousBoard, previousDetail };
    },
    onSuccess: (task: TaskData) => {
      patchTaskInBoard(queryClient, projectId, task);
      queryClient.invalidateQueries({ queryKey: detailKey });
      invalidateProjectOverview(queryClient, projectId);
      invalidateFocusQueries(queryClient);
    },
    onError: (_err, _vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKey, context.previousBoard);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(detailKey, context.previousDetail);
      }
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();
  const boardKey = projectBoardKey(projectId);
  const detailKey = PROJECT_KEYS.detail(projectId);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskData> }) =>
      tasksService.updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previousBoard = queryClient.getQueryData<ProjectData>(boardKey);
      const previousDetail = queryClient.getQueryData<ProjectData>(detailKey);

      const updateTaskInProject = (old: ProjectData | undefined) => {
        if (!old?.columns) return old;
        return {
          ...old,
          columns: old.columns.map(col => ({
            ...col,
            tasks: (col.tasks || []).map(t => t.id === id ? { ...t, ...data } : t),
          })),
        };
      };

      queryClient.setQueryData<ProjectData>(boardKey, updateTaskInProject);
      queryClient.setQueryData<ProjectData>(detailKey, updateTaskInProject);

      return { previousBoard, previousDetail };
    },
    onSuccess: (task: TaskData) => {
      patchTaskInBoard(queryClient, projectId, task);
      queryClient.invalidateQueries({ queryKey: detailKey });
      invalidateProjectOverview(queryClient, projectId);
      invalidateFocusQueries(queryClient);
    },
    onError: (_err, _vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKey, context.previousBoard);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(detailKey, context.previousDetail);
      }
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksService.deleteTask(id),
    onSuccess: (_data, taskId) => {
      removeTaskFromBoard(queryClient, projectId, taskId);
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
      invalidateProjectOverview(queryClient, projectId);
      invalidateFocusQueries(queryClient);
    },
  });
}

export function useCreateColumn(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateColumnInput) => columnsService.createColumn(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectBoardKey(projectId) });
      invalidateFocusQueries(queryClient);
    },
  });
}

export function useAddChecklistItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
      tasksService.addChecklistItem(taskId, title),
    onSuccess: (item: ChecklistItemData, variables) => {
      appendChecklistToBoard(queryClient, projectId, variables.taskId, item);
      invalidateProjectOverview(queryClient, projectId);
      invalidateFocusQueries(queryClient);
    },
  });
}

export function useUpdateChecklistItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChecklistItemData> }) =>
      tasksService.updateChecklistItem(id, data),
    onSuccess: (item: ChecklistItemData) => {
      patchChecklistInBoard(queryClient, projectId, item);
      invalidateProjectOverview(queryClient, projectId);
      invalidateFocusQueries(queryClient);
    },
  });
}
