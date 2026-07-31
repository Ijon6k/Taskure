import { fetcher } from "../client";
import { ProjectData, CreateProjectInput, UpdateProjectInput } from "../types";

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

  getProjectBoard: (id: string) => {
    return fetcher<ProjectData>(`/projects/${id}/board`);
  },

  createProject: (data: CreateProjectInput) => {
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

  uploadResource: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetcher<ProjectData>(`/projects/${id}/resources/upload`, {
      method: "POST",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  deleteResource: (id: string, resourceId: string) => {
    return fetcher<ProjectData>(`/projects/${id}/resources/${resourceId}`, {
      method: "DELETE",
    });
  },

  deleteProject: (id: string) => {
    return fetcher<{ message: string }>(`/projects/${id}`, {
      method: "DELETE",
    });
  },
};
