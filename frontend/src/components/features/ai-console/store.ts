"use client";

import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIMode = "fast" | "thinking" | "planning" | "agent";

export type ExecutionState =
  | "idle"
  | "streaming"
  | "tool-call"
  | "context-retrieval"
  | "analyzing"
  | "done"
  | "error";

export interface ContextBreakdown {
  system: number;
  messages: number;
  tools: number;
  reasoning: number;
}

export interface ContextUsage {
  used: number;
  total: number;
  breakdown: ContextBreakdown;
}

export interface AIActivity {
  id: string;
  type: "state" | "tool_call" | "tool_result" | "context";
  name?: string | undefined;
  arguments?: Record<string, unknown> | undefined;
  status?: "pending" | "running" | "success" | "error" | undefined;
  result?: unknown;
  details?: string | undefined;
  timestamp: number;
}

export interface ConsoleMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  executionState?: ExecutionState | undefined;
  contextUsage?: ContextUsage | undefined;
  activities?: AIActivity[] | undefined;
}

// ─── Store State ──────────────────────────────────────────────────────────────

interface AIConsoleState {
  projectId: string;
  setProjectId: (id: string) => void;

  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  mode: AIMode;
  setMode: (mode: AIMode) => void;

  selectedProviderId: string;
  setSelectedProviderId: (id: string) => void;

  messages: ConsoleMessage[];
  addMessage: (msg: ConsoleMessage) => void;
  updateMessage: (id: string, patch: Partial<ConsoleMessage>) => void;
  addActivityToMessage: (messageId: string, activity: AIActivity) => void;
  clearMessages: () => void;

  input: string;
  setInput: (input: string) => void;

  executionState: ExecutionState;
  setExecutionState: (state: ExecutionState) => void;

  progressDetail: string | null;
  setProgressDetail: (detail: string | null) => void;

  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;

  contextUsage: ContextUsage | null;
  setContextUsage: (usage: ContextUsage | null) => void;

  error: string | null;
  setError: (err: string | null) => void;

  isContextPanelOpen: boolean;
  setContextPanelOpen: (v: boolean) => void;

  isBubbleOpen: boolean;
  setIsBubbleOpen: (v: boolean) => void;
  toggleBubble: () => void;

  isFullView: boolean;
  setIsFullView: (v: boolean) => void;
  toggleFullView: () => void;

  isHistorySidebarOpen: boolean;
  setIsHistorySidebarOpen: (v: boolean) => void;
  toggleHistorySidebar: () => void;

  abortController: AbortController | null;
  setAbortController: (ctrl: AbortController | null) => void;
}

let msgCounter = 0;

function newMessageId(): string {
  msgCounter += 1;
  return `ai-msg-${Date.now()}-${msgCounter}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAIConsoleStore = create<AIConsoleState>((set) => ({
  projectId: "",
  setProjectId: (projectId) => set({ projectId }),

  activeConversationId: null,
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),

  mode: "thinking",
  setMode: (mode) => set({ mode }),

  selectedProviderId: "",
  setSelectedProviderId: (selectedProviderId) => set({ selectedProviderId }),

  messages: [],
  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  addActivityToMessage: (messageId, activity) =>
    set((s) => ({
      messages: s.messages.map((m) => {
        if (m.id !== messageId) return m;
        const currentActivities = m.activities || [];
        const existingIdx = currentActivities.findIndex(
          (a) => a.type === "tool_call" && a.name === activity.name && (a.status === "pending" || a.status === "running")
        );
        if (existingIdx !== -1 && activity.type === "tool_result") {
          const updated = [...currentActivities];
          const prev = updated[existingIdx];
          if (prev) {
            const updatedItem: AIActivity = {
              id: prev.id,
              type: prev.type,
              timestamp: prev.timestamp,
              status: activity.status || "success",
              ...(prev.name !== undefined ? { name: prev.name } : {}),
              ...(prev.arguments !== undefined ? { arguments: prev.arguments } : {}),
              ...(activity.result !== undefined ? { result: activity.result } : {}),
              ...(prev.details !== undefined ? { details: prev.details } : {}),
            };
            updated[existingIdx] = updatedItem;
            return { ...m, activities: updated };
          }
        }
        return { ...m, activities: [...currentActivities, activity] };
      }),
    })),
  clearMessages: () => set({ messages: [], error: null }),

  input: "",
  setInput: (input) => set({ input }),

  executionState: "idle",
  setExecutionState: (executionState) => set({ executionState }),

  progressDetail: null,
  setProgressDetail: (progressDetail) => set({ progressDetail }),

  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),

  contextUsage: null,
  setContextUsage: (contextUsage) => set({ contextUsage }),

  error: null,
  setError: (error) => set({ error }),

  isContextPanelOpen: false,
  setContextPanelOpen: (isContextPanelOpen) => set({ isContextPanelOpen }),

  isBubbleOpen: false,
  setIsBubbleOpen: (isBubbleOpen) => set({ isBubbleOpen }),
  toggleBubble: () => set((s) => ({ isBubbleOpen: !s.isBubbleOpen })),

  isFullView: false,
  setIsFullView: (isFullView) => set({ isFullView }),
  toggleFullView: () => set((s) => ({ isFullView: !s.isFullView })),

  // Closed by default per user request
  isHistorySidebarOpen: false,
  setIsHistorySidebarOpen: (isHistorySidebarOpen) => set({ isHistorySidebarOpen }),
  toggleHistorySidebar: () => set((s) => ({ isHistorySidebarOpen: !s.isHistorySidebarOpen })),

  abortController: null,
  setAbortController: (abortController) => set({ abortController }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function createUserMessage(content: string): ConsoleMessage {
  return {
    id: newMessageId(),
    role: "user",
    content,
    timestamp: Date.now(),
  };
}

export function createAssistantPlaceholder(): ConsoleMessage {
  return {
    id: newMessageId(),
    role: "assistant",
    content: "",
    timestamp: Date.now(),
    executionState: "idle",
  };
}
