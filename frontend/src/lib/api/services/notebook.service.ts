import { fetcher } from "../client";
import {
  NotebookPageData,
  NotebookPageDetailData,
  CreateNotebookPageInput,
  UpdateNotebookPageInput,
} from "../types";

/** Notebook endpoints: project-scoped page list/create and page detail CRUD. */
export const notebookService = {
  getPages: (projectId: string) => {
    return fetcher<NotebookPageData[]>(`/projects/${projectId}/notebook`);
  },

  createPage: (projectId: string, data: CreateNotebookPageInput = {}) => {
    return fetcher<NotebookPageData>(`/projects/${projectId}/notebook`, {
      method: "POST",
      data,
    });
  },

  getPage: (id: string) => {
    return fetcher<NotebookPageDetailData>(`/notebook/${id}`);
  },

  updatePage: (id: string, data: UpdateNotebookPageInput) => {
    return fetcher<NotebookPageDetailData>(`/notebook/${id}`, {
      method: "PATCH",
      data,
    });
  },

  deletePage: (id: string) => {
    return fetcher<{ message: string }>(`/notebook/${id}`, {
      method: "DELETE",
    });
  },
};
