import { fetcher } from "../client";
import { FocusResponse } from "../types";

export const workspaceService = {
  updateWorkspaceSettings: (settings: Record<string, unknown>) => {
    return fetcher<{ message: string }>("/workspaces/default", {
      method: "PATCH",
      data: { settings },
    });
  },

  getFocusTask: () => {
    const tzOffsetMinutes = -new Date().getTimezoneOffset();
    return fetcher<FocusResponse>(`/focus?tz_offset_minutes=${tzOffsetMinutes}`);
  },

  seedDemoData: () => {
    return fetcher<{ message: string; projects: string[] }>("/seed", {
      method: "POST",
    });
  },
};
