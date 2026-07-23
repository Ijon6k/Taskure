import { fetcher } from "../client";
import { ProjectData, UpdateProjectInput } from "../types";

export const projectsService = {
  getProjects: (params?: { status?: string; search?: string; pinned?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.pinned) query.set("pinned", "true");
    const qs = query.toString();
    return fetcher<ProjectData[]>(`/projects${qs ? `?${qs}` : ""}`);
  },

  getProject: (id: string) => {
    return fetcher<ProjectData>(`/projects/${id}`);
  },

  createProject: (data: { name: string; description?: string; color?: string; icon?: string; status?: string; is_pinned?: boolean }) => {
    return fetcher<ProjectData>("/projects", {
      method: "POST",
      data,
    });
  },

  updateProject: (id: string, data: UpdateProjectInput) => {
    return fetcher<ProjectData>(`/projects/${id}`, {
      method: "PATCH",
      data,
    });
  },

  deleteProject: (id: string) => {
    return fetcher<{ message: string }>(`/projects/${id}`, {
      method: "DELETE",
    });
  },
};
