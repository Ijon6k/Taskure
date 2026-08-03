import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notebookService } from "../services/notebook.service";
import {
  CreateNotebookPageInput,
  NotebookPageData,
  UpdateNotebookPageInput,
} from "../types";

/** React Query key builders for notebook page queries. */
export const NOTEBOOK_KEYS = {
  all: ["notebook"] as const,
  list: (projectId: string) => [...NOTEBOOK_KEYS.all, "list", projectId] as const,
  detail: (id: string) => [...NOTEBOOK_KEYS.all, "detail", id] as const,
};

/** Fetches the lightweight page list (titles only, no markdown content). */
export function useNotebookPages(projectId: string) {
  return useQuery({
    queryKey: NOTEBOOK_KEYS.list(projectId),
    queryFn: () => notebookService.getPages(projectId),
    enabled: Boolean(projectId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}

/** Fetches a single page including its markdown content. */
export function useNotebookPage(id: string) {
  return useQuery({
    queryKey: NOTEBOOK_KEYS.detail(id),
    queryFn: () => notebookService.getPage(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}

/** Creates a page and invalidates the project's page list. */
export function useCreateNotebookPage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNotebookPageInput) =>
      notebookService.createPage(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTEBOOK_KEYS.list(projectId) });
    },
  });
}

/** Updates a page — patches the detail cache and the list summary in place. */
export function useUpdateNotebookPage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNotebookPageInput }) =>
      notebookService.updatePage(id, data),
    onSuccess: (page) => {
      queryClient.setQueryData(NOTEBOOK_KEYS.detail(page.id), page);
      queryClient.setQueryData<NotebookPageData[]>(NOTEBOOK_KEYS.list(projectId), (pages) => {
        if (!pages) return pages;
        return pages.map((p) =>
          p.id === page.id
            ? {
                ...p,
                title: page.title,
                position: page.position,
                is_pinned: page.is_pinned,
                updated_at: page.updated_at,
              }
            : p
        );
      });
    },
  });
}

/** Deletes a page and invalidates the project's page list. */
export function useDeleteNotebookPage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notebookService.deletePage(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: NOTEBOOK_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: NOTEBOOK_KEYS.list(projectId) });
    },
  });
}
