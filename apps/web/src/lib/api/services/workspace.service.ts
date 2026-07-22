import { fetcher } from "../client";
import { FocusResult } from "../types";

export const workspaceService = {
  updateWorkspaceSettings: (settings: Record<string, unknown>) => {
    return fetcher<{ message: string }>("/workspaces/default", {
      method: "PATCH",
      data: { settings },
    });
  },

  getFocusTask: () => {
    return fetcher<{ focus: FocusResult | null }>("/focus");
  },

  seedDemoData: () => {
    return fetcher<{ message: string; projects: string[] }>("/seed", {
      method: "POST",
    });
  },
};
