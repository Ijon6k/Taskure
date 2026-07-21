// ============================================================
// ZOD VALIDATION SCHEMAS — API boundary validation
// Used by: Next.js API client, form validation
// ============================================================

import { z } from 'zod';

// --- Enums as Zod schemas ---

export const PrioritySchema = z.enum(['urgent', 'high', 'medium', 'low', 'none']);
export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'done', 'cancelled']);
export const CaptureSourceSchema = z.enum(['quick_note', 'clipboard', 'file_import', 'api']);
export const ContextTypeSchema = z.enum(['project', 'label', 'time_block', 'routine']);
export const ThemeModeSchema = z.enum(['dark', 'dim', 'light']);
export const AIAgentProviderSchema = z.enum(['openai', 'anthropic']);

// --- Workspace ---

export const WorkspaceSettingsSchema = z.object({
  defaultTheme: ThemeModeSchema.default('dim'),
  aiProvider: AIAgentProviderSchema.default('anthropic'),
  aiModel: z.string().default('claude-sonnet-4-20250514'),
  timezone: z.string().default('Asia/Jakarta'),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).default(1),
});

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
});

export const UpdateWorkspaceSchema = CreateWorkspaceSchema.partial().extend({
  settings: WorkspaceSettingsSchema.partial(),
});

// --- Project ---

export const ProjectSettingsSchema = z.object({
  enableAI: z.boolean().default(true),
  defaultColumnNames: z.array(z.string()).default(['To Do', 'In Progress', 'Done']),
  showSubtaskProgress: z.boolean().default(true),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  workspaceId: z.string().uuid(),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  settings: ProjectSettingsSchema.optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

// --- Column ---

export const CreateColumnSchema = z.object({
  name: z.string().min(1).max(50),
  position: z.number().int().min(0),
  projectId: z.string().uuid(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  wipLimit: z.number().int().min(1).optional(),
});

export const UpdateColumnSchema = CreateColumnSchema.partial();

// --- Task ---

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  columnId: z.string().uuid(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  priority: PrioritySchema.default('medium'),
  status: TaskStatusSchema.default('todo'),
  position: z.number().int().min(0).default(0),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  estimatedHours: z.number().positive().optional(),
  labelIds: z.array(z.string().uuid()).default([]),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: TaskStatusSchema.optional(),
});

export const MoveTaskSchema = z.object({
  taskId: z.string().uuid(),
  targetColumnId: z.string().uuid(),
  position: z.number().int().min(0),
});

// --- Label ---

export const CreateLabelSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  projectId: z.string().uuid().optional(),
  workspaceId: z.string().uuid(),
});

export const UpdateLabelSchema = CreateLabelSchema.partial();

// --- ChecklistItem ---

export const CreateChecklistItemSchema = z.object({
  title: z.string().min(1).max(200),
  position: z.number().int().min(0).default(0),
  taskId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
});

export const UpdateChecklistItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isCompleted: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

// --- TaskNote ---

export const CreateTaskNoteSchema = z.object({
  content: z.string().min(1).max(10000),
  taskId: z.string().uuid(),
  isPinned: z.boolean().default(false),
});

export const UpdateTaskNoteSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  isPinned: z.boolean().optional(),
});

// --- Capture ---

export const CreateCaptureSchema = z.object({
  content: z.string().min(1).max(5000),
  source: CaptureSourceSchema,
  workspaceId: z.string().uuid(),
});

// --- Discussion ---

export const CreateDiscussionSchema = z.object({
  content: z.string().min(1).max(5000),
  taskId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  mentions: z.array(z.string()).default([]),
});

// --- Auth ---

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// --- AI ---

export const AIChatSchema = z.object({
  message: z.string().min(1).max(4000),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  provider: AIAgentProviderSchema.optional(),
  model: z.string().optional(),
  stream: z.boolean().default(true),
});

export const AIEmbedSchema = z.object({
  text: z.string().min(1).max(8000),
});

// --- Pagination ---

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

// --- ID Param ---

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

// --- Theme ---

export const ThemeUpdateSchema = z.object({
  mode: ThemeModeSchema,
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// --- Bulk Operations ---

export const BulkTaskMoveSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(50),
  targetColumnId: z.string().uuid(),
  position: z.number().int().min(0),
});

export const BulkTaskDeleteSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(50),
});
