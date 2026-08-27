"use client";

import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIMode = "fast" | "thinking" | "planning" | "agent";

export type ExecutionState =
  | "idle"
  | "streaming"
  | "tool-call"
  | "context-retrieval"
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

export interface ConsoleMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  executionState?: ExecutionState | undefined;
  contextUsage?: ContextUsage | undefined;
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
  clearMessages: () => void;

  input: string;
  setInput: (input: string) => void;

  executionState: ExecutionState;
  setExecutionState: (state: ExecutionState) => void;

  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;

  contextUsage: ContextUsage | null;
  setContextUsage: (usage: ContextUsage | null) => void;

  error: string | null;
  setError: (err: string | null) => void;

  isContextPanelOpen: boolean;
  setContextPanelOpen: (v: boolean) => void;

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

  mode: "fast",
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
  clearMessages: () => set({ messages: [], error: null }),

  input: "",
  setInput: (input) => set({ input }),

  executionState: "idle",
  setExecutionState: (executionState) => set({ executionState }),

  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),

  contextUsage: null,
  setContextUsage: (contextUsage) => set({ contextUsage }),

  error: null,
  setError: (error) => set({ error }),

  isContextPanelOpen: false,
  setContextPanelOpen: (isContextPanelOpen) => set({ isContextPanelOpen }),

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
