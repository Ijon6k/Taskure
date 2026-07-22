import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceService } from "../services/workspace.service";
import { PROJECT_KEYS } from "./use-projects";

export const WORKSPACE_KEYS = {
  focus: ["workspace", "focus"] as const,
};

export function useFocusTask() {
  return useQuery({
    queryKey: WORKSPACE_KEYS.focus,
    queryFn: () => workspaceService.getFocusTask(),
  });
}

export function useSeedDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => workspaceService.seedDemoData(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.focus });
    },
  });
}
