import { apiClient } from "../client";
import type { Conversation, ConversationMessage } from "../types";

export interface CreateConversationRequest {
  title?: string;
  mode?: "fast" | "thinking" | "planning" | "agent";
}

export interface AddMessageRequest {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: unknown;
  metadata?: Record<string, unknown>;
  token_count?: number;
}

export const conversationsService = {
  list: (projectId: string) =>
    apiClient
      .get<Conversation[]>(`/projects/${projectId}/conversations`)
      .then((r) => r.data),

  get: (id: string) =>
    apiClient
      .get<Conversation>(`/conversations/${id}`)
      .then((r) => r.data),

  create: (projectId: string, data: CreateConversationRequest) =>
    apiClient.post(`/projects/${projectId}/conversations`, data),

  addMessage: (conversationId: string, data: AddMessageRequest) =>
    apiClient.post(`/conversations/${conversationId}/messages`, data),

  getMessages: (conversationId: string) =>
    apiClient
      .get<ConversationMessage[]>(`/conversations/${conversationId}/messages`)
      .then((r) => r.data),

  getMessageContext: (conversationId: string) =>
    apiClient
      .get<ConversationMessage[]>(`/conversations/${conversationId}/context`)
      .then((r) => r.data),
};
