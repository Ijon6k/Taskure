export * from "./api/types";
export * from "./api/client";
export * from "./api/services";
export * from "./api/queries";

// Backward compatibility alias object
import { projectsService } from "./api/services/projects.service";
import { columnsService } from "./api/services/columns.service";
import { tasksService } from "./api/services/tasks.service";
import { workspaceService } from "./api/services/workspace.service";
import { notebookService } from "./api/services/notebook.service";

/** Backward-compatible facade exposing every API service under one object. */
export const api = {
  getProjects: projectsService.getProjects,
  getProject: projectsService.getProject,
  getProjectBoard: projectsService.getProjectBoard,
  getProjectOverview: projectsService.getProjectOverview,
  getProjectAssets: projectsService.getProjectAssets,
  createProject: projectsService.createProject,
  updateProject: projectsService.updateProject,
  uploadProjectResource: projectsService.uploadResource,
  deleteProjectResource: projectsService.deleteResource,
  deleteProject: projectsService.deleteProject,

  createColumn: columnsService.createColumn,
  updateColumn: columnsService.updateColumn,
  deleteColumn: columnsService.deleteColumn,

  createTask: tasksService.createTask,
  getTask: tasksService.getTask,
  updateTask: tasksService.updateTask,
  moveTask: tasksService.moveTask,
  deleteTask: tasksService.deleteTask,
  addChecklistItem: tasksService.addChecklistItem,
  updateChecklistItem: tasksService.updateChecklistItem,
  deleteChecklistItem: tasksService.deleteChecklistItem,
  uploadTaskAttachment: tasksService.uploadAttachment,
  deleteTaskAttachment: tasksService.deleteAttachment,

  updateWorkspaceSettings: workspaceService.updateWorkspaceSettings,
  getFocusTask: workspaceService.getFocusTask,
  seedDemoData: workspaceService.seedDemoData,

  getNotebookPages: notebookService.getPages,
  createNotebookPage: notebookService.createPage,
  getNotebookPage: notebookService.getPage,
  updateNotebookPage: notebookService.updatePage,
  deleteNotebookPage: notebookService.deletePage,
};
