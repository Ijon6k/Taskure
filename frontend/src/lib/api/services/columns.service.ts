import { fetcher } from "../client";
import { ColumnData, CreateColumnInput } from "../types";

/** Column endpoints. */
export const columnsService = {
  createColumn: (projectId: string, data: CreateColumnInput) => {
    return fetcher<ColumnData>(`/projects/${projectId}/columns`, {
      method: "POST",
      data,
    });
  },

  updateColumn: (id: string, data: Partial<ColumnData>) => {
    return fetcher<ColumnData>(`/columns/${id}`, {
      method: "PATCH",
      data,
    });
  },

  deleteColumn: (id: string) => {
    return fetcher<{ message: string }>(`/columns/${id}`, {
      method: "DELETE",
    });
  },
};
