import { z } from "zod";

// Project Validations
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  color: z.string(),
  icon: z.string(),
  status: z.string(),
});

export type CreateProjectSchema = z.infer<typeof createProjectSchema>;

// Task Validations
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(200, "Task title cannot exceed 200 characters"),
  description: z.string().optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]),
  due_date: z.string().nullable().optional(),
  column_id: z.string().min(1, "Column ID is required"),
});

export type CreateTaskSchema = z.infer<typeof createTaskSchema>;

// Column Validations
export const createColumnSchema = z.object({
  name: z
    .string()
    .min(1, "Column name is required")
    .max(50, "Column name cannot exceed 50 characters"),
  color: z.string(),
});

export type CreateColumnSchema = z.infer<typeof createColumnSchema>;

// Checklist Item Validations
export const createChecklistSchema = z.object({
  title: z
    .string()
    .min(1, "Subtask title is required")
    .max(150, "Subtask title cannot exceed 150 characters"),
});

export type CreateChecklistSchema = z.infer<typeof createChecklistSchema>;
