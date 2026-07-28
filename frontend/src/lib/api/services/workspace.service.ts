import { fetcher } from "../client";
import { FocusResponse, FocusOverview } from "../types";

export const workspaceService = {
  updateWorkspaceSettings: (settings: Record<string, unknown>) => {
    return fetcher<{ message: string }>("/workspaces/default", {
      method: "PATCH",
      data: { settings },
    });
  },

  getFocusTask: () => {
    return fetcher<FocusResponse>("/focus");
  },

  getFocusOverview: () => {
    return fetcher<FocusOverview>("/focus/overview");
  },

  seedDemoData: () => {
    return fetcher<{ message: string; projects: string[] }>("/seed", {
      method: "POST",
    });
  },
};
