export * from "./api/types";
export * from "./api/client";
export * from "./api/services";
export * from "./api/queries";

// Backward compatibility alias object
import { projectsService } from "./api/services/projects.service";
import { columnsService } from "./api/services/columns.service";
import { tasksService } from "./api/services/tasks.service";
import { workspaceService } from "./api/services/workspace.service";

export const api = {
  getProjects: projectsService.getProjects,
  getProject: projectsService.getProject,
  createProject: projectsService.createProject,
  updateProject: projectsService.updateProject,
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

  updateWorkspaceSettings: workspaceService.updateWorkspaceSettings,
  getFocusTask: workspaceService.getFocusTask,
  seedDemoData: workspaceService.seedDemoData,
};
