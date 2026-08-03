import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { workspaceService } from "../services/workspace.service";
import { PROJECT_KEYS } from "./use-projects";

/** React Query keys for workspace-scoped queries. */
export const WORKSPACE_KEYS = {
  focus: ["workspace", "focus"] as const,
};

/** Invalidates all focus queries (used after any task/project mutation). */
export function invalidateFocusQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.focus });
}

/** Fetches today's single focus task for the current timezone. */
export function useFocusTask() {
  return useQuery({
    queryKey: WORKSPACE_KEYS.focus,
    queryFn: () => workspaceService.getFocusTask(),
  });
}

/** Seeds a demo workspace, then refreshes project + focus queries. */
export function useSeedDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => workspaceService.seedDemoData(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
      invalidateFocusQueries(queryClient);
    },
  });
}
