// ============================================================
// CORE DOMAIN TYPES — mirrors Go Ent models
// Strict 1:1 mapping between TypeScript types and Go Ent schemas
// ============================================================

// --- Enums ---

export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type CaptureSource = 'quick_note' | 'clipboard' | 'file_import' | 'api';
export type ContextType = 'project' | 'label' | 'time_block' | 'routine';
export type AIAgentProvider = 'openai' | 'anthropic';
export type AIAgentModel = string;

// --- Base ---

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Workspace ---

export interface Workspace extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  settings: WorkspaceSettings;
}

export interface WorkspaceSettings {
  defaultTheme: ThemeMode;
  aiProvider: AIAgentProvider;
  aiModel: string;
  timezone: string;
  weekStartsOn: 0 | 1;
}

// --- Project ---

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  workspaceId: string;
  ownerId: string;
  icon?: string;
  color?: string;
  isArchived: boolean;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  enableAI: boolean;
  defaultColumnNames: string[];
  showSubtaskProgress: boolean;
}

// --- Column ---

export interface Column extends BaseEntity {
  name: string;
  position: number;
  projectId: string;
  color?: string;
  wipLimit?: number;
}

// --- Task ---

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  columnId: string;
  projectId: string;
  assigneeId?: string;
  priority: Priority;
  status: TaskStatus;
  position: number;
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  labels: Label[];
  checklistItems: ChecklistItem[];
}

export interface TaskWithRelations extends Task {
  labels: Label[];
  checklistItems: ChecklistItem[];
  notes: TaskNote[];
  attachments: Attachment[];
}

// --- Label ---

export interface Label extends BaseEntity {
  name: string;
  color: string;
  projectId?: string;
  workspaceId: string;
}

// --- ChecklistItem ---

export interface ChecklistItem extends BaseEntity {
  title: string;
  isCompleted: boolean;
  position: number;
  taskId: string;
  assigneeId?: string;
}

// --- TaskNote ---

export interface TaskNote extends BaseEntity {
  content: string;
  taskId: string;
  authorId: string;
  isPinned: boolean;
}

// --- Attachment ---

export interface Attachment extends BaseEntity {
  filename: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  taskId: string;
  uploaderId: string;
}

// --- Capture ---

export interface Capture extends BaseEntity {
  content: string;
  source: CaptureSource;
  userId: string;
  workspaceId: string;
  processedAt?: Date;
}

// --- ProjectContext (RAG knowledge for AI) ---

export interface ProjectContext extends BaseEntity {
  content: string;
  chunkIndex: number;
  totalChunks: number;
  contextType: ContextType;
  projectId: string;
  metadata: Record<string, unknown>;
}

// --- Discussion ---

export interface Discussion extends BaseEntity {
  content: string;
  taskId?: string;
  projectId: string;
  authorId: string;
  parentId?: string;
  mentions: string[];
}

// --- Activity ---

export interface Activity extends BaseEntity {
  action: string;
  entityType: 'workspace' | 'project' | 'task' | 'column' | 'label';
  entityId: string;
  actorId: string;
  metadata: Record<string, unknown>;
}

// --- User ---

export interface User extends BaseEntity {
  email: string;
  name: string;
  avatarUrl?: string;
  workspaceIds: string[];
}

// --- Theme ---

export type ThemeMode = 'dark' | 'dim' | 'light';

export interface ThemeConfig {
  mode: ThemeMode;
  accentColor?: string; // For future custom accent picker
}

// --- API Response Wrappers ---

export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  data?: never;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// --- WebSocket Events ---

export type WsEventType =
  | 'task:created'
  | 'task:updated'
  | 'task:moved'
  | 'task:deleted'
  | 'column:created'
  | 'column:updated'
  | 'column:deleted'
  | 'project:updated'
  | 'activity:new';

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: Date;
}
