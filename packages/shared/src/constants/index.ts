// ============================================================
// CONSTANTS — Priority, Status, Sources, Context types, etc.
// ============================================================

import type { Priority, TaskStatus, CaptureSource, ContextType, ThemeMode } from '../types';

// --- Priority ---

export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
  none: '#374151',
};

// --- Task Status ---

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

// --- Capture Source ---

export const CAPTURE_SOURCE_LABELS: Record<CaptureSource, string> = {
  quick_note: 'Quick Note',
  clipboard: 'Clipboard',
  file_import: 'File Import',
  api: 'API',
};

// --- Context Type ---

export const CONTEXT_TYPE_LABELS: Record<ContextType, string> = {
  project: 'Project Overview',
  label: 'Label',
  time_block: 'Time Block',
  routine: 'Routine',
};

// --- Theme ---

export const THEME_MODES: ThemeMode[] = ['dark', 'dim', 'light'];

export const THEME_LABELS: Record<ThemeMode, string> = {
  dark: 'Dark (OLED)',
  dim: 'Dim (Default)',
  light: 'Light',
};

// --- Default Column Names ---

export const DEFAULT_COLUMN_NAMES = ['To Do', 'In Progress', 'Done'];

// --- API Limits ---

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_EMBEDDING_CHUNK_SIZE = 8000;
export const MAX_TASK_TITLE_LENGTH = 200;
export const MAX_TASK_DESCRIPTION_LENGTH = 5000;
export const MAX_PROJECT_NAME_LENGTH = 100;
export const MAX_WORKSPACE_NAME_LENGTH = 100;

// --- Pagination ---

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// --- AI ---

export const DEFAULT_OPENAI_MODEL = 'gpt-4o';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

// --- Colors (Brand palette for UI reference) ---

export const BRAND_COLORS = {
  lavender: '#B4A0E5',
  'lavender-muted': '#8B7EC1',
  blue: '#A0C4E8',
  'blue-muted': '#7FACD4',
  pink: '#E8B4C8',
  'pink-muted': '#D495AF',
} as const;

// --- Semantic Colors ---

export const SEMANTIC_COLORS = {
  info: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

// --- Activity Actions ---

export const ACTIVITY_ACTIONS = {
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_MOVED: 'task:moved',
  TASK_DELETED: 'task:deleted',
  TASK_COMPLETED: 'task:completed',
  COLUMN_CREATED: 'column:created',
  COLUMN_UPDATED: 'column:updated',
  COLUMN_DELETED: 'column:deleted',
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_ARCHIVED: 'project:archived',
} as const;
