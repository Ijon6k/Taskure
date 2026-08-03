import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsService } from "../services/projects.service";
import { CreateProjectInput, ProjectData } from "../types";
import { invalidateFocusQueries } from "./use-workspace";

export const PROJECT_KEYS = {
  all: ["projects"] as const,
  list: (filters?: { status?: string; search?: string; pinned?: boolean }) =>
    [...PROJECT_KEYS.all, "list", filters] as const,
  detail: (id: string) => [...PROJECT_KEYS.all, "detail", id] as const,
};

export function useProjects(filters?: { status?: string; search?: string; pinned?: boolean }) {
  return useQuery({
    queryKey: PROJECT_KEYS.list(filters),
    queryFn: () => projectsService.getProjects(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(id),
    queryFn: () => projectsService.getProject(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}

export function useProjectBoard(id: string) {
  return useQuery({
    queryKey: [...PROJECT_KEYS.all, "board", id],
    queryFn: () => projectsService.getProjectBoard(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}

export function useProjectOverview(id: string) {
  return useQuery({
    queryKey: [...PROJECT_KEYS.all, "overview", id],
    queryFn: () => projectsService.getProjectOverview(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectsService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
      invalidateFocusQueries(queryClient);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectData> }) =>
      projectsService.updateProject(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, "board", variables.id] });
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, "overview", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["project", "assets", variables.id] });
      invalidateFocusQueries(queryClient);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsService.deleteProject(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, "board", variables] });
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, "overview", variables] });
      queryClient.invalidateQueries({ queryKey: ["project", "assets", variables] });
      invalidateFocusQueries(queryClient);
    },
  });
}

export function useSuggestedTags(projectId: string) {
  return useQuery({
    queryKey: [...PROJECT_KEYS.all, "suggested-tags", projectId],
    queryFn: () => projectsService.getSuggestedTags(projectId),
    enabled: Boolean(projectId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}
