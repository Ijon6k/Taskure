import { fetcher } from "../client";
import { TaskData, ChecklistItemData, CreateTaskInput, MoveTaskInput, UpdateTaskInput } from "../types";

export const tasksService = {
  createTask: (projectId: string, data: CreateTaskInput) => {
    return fetcher<TaskData>(`/projects/${projectId}/tasks`, {
      method: "POST",
      data,
    });
  },

  getTask: (id: string, init?: { signal?: AbortSignal }) => {
    return fetcher<TaskData>(`/tasks/${id}`, init?.signal ? { signal: init.signal } : undefined);
  },


  updateTask: (id: string, data: UpdateTaskInput) => {
    return fetcher<TaskData>(`/tasks/${id}`, {
      method: "PATCH",
      data,
    });
  },

  moveTask: (id: string, data: MoveTaskInput) => {
    return fetcher<TaskData>(`/tasks/${id}/move`, {
      method: "PATCH",
      data,
    });
  },

  deleteTask: (id: string) => {
    return fetcher<{ message: string }>(`/tasks/${id}`, {
      method: "DELETE",
    });
  },

  // Checklist
  addChecklistItem: (taskId: string, title: string) => {
    return fetcher<ChecklistItemData>(`/tasks/${taskId}/checklist`, {
      method: "POST",
      data: { title },
    });
  },

  updateChecklistItem: (id: string, data: Partial<ChecklistItemData>) => {
    return fetcher<ChecklistItemData>(`/checklist/${id}`, {
      method: "PATCH",
      data,
    });
  },

  deleteChecklistItem: (id: string) => {
    return fetcher<{ message: string }>(`/checklist/${id}`, {
      method: "DELETE",
    });
  },

  // Attachments (MinIO S3)
  uploadAttachment: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetcher<TaskData>(`/tasks/${taskId}/attachments`, {
      method: "POST",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  deleteAttachment: (taskId: string, attachmentId: string) => {
    return fetcher<TaskData>(`/tasks/${taskId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
  },
};
