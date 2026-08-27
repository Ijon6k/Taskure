"use client";

import { useState, useCallback, useEffect, memo } from "react";
import { useAIConsoleStore, createUserMessage, createAssistantPlaceholder } from "./store";
import { ModeSelector } from "./mode-selector";
import { MessageStream } from "./message-stream";
import { InputArea } from "./input-area";
import { ContextPanel } from "./context-panel";
import { ConversationList, type ConversationItem } from "./conversation-list";
import { conversationsService } from "@/lib/api/services/conversations.service";
import type { Conversation } from "@/lib/api/types";
import { toast } from "sonner";

function toConversationItem(c: Conversation): ConversationItem {
  return {
    id: c.id,
    title: c.title,
    mode: c.mode,
    updatedAt: c.updated_at,
  };
}

export const AIConsole = memo(function AIConsole() {
  const error = useAIConsoleStore((s) => s.error);
  const isContextPanelOpen = useAIConsoleStore((s) => s.isContextPanelOpen);
  const setContextPanelOpen = useAIConsoleStore((s) => s.setContextPanelOpen);
  const contextUsage = useAIConsoleStore((s) => s.contextUsage);
  const projectId = useAIConsoleStore((s) => s.projectId);
  const mode = useAIConsoleStore((s) => s.mode);
  const addMessage = useAIConsoleStore((s) => s.addMessage);
  const clearMessages = useAIConsoleStore((s) => s.clearMessages);
  const setError = useAIConsoleStore((s) => s.setError);
  const setContextUsage = useAIConsoleStore((s) => s.setContextUsage);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const activeConvId = useAIConsoleStore((s) => s.activeConversationId);
  const setActiveConvId = useAIConsoleStore((s) => s.setActiveConversationId);

  // Fetch conversations for the current project. When switching projects,
  // reset all session state so sessions are never mixed across projects.
  useEffect(() => {
    setConversations([]);
    setActiveConvId(null);
    clearMessages();
    setError(null);
    setContextUsage(null);

    if (!projectId) return;

    conversationsService
      .list(projectId)
      .then((data) => setConversations(data.map(toConversationItem)))
      .catch((e) => {
        toast.error("Failed to load conversations");
        console.warn("Failed to load conversations", e);
      });
  }, [projectId, setActiveConvId, clearMessages, setError, setContextUsage]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConvId(id);

    conversationsService
      .getMessages(id)
      .then((msgs) => {
        clearMessages();
        for (const m of msgs) {
          if (m.role === "user") {
            addMessage(createUserMessage(m.content));
          } else if (m.role === "assistant") {
            const placeholder = createAssistantPlaceholder();
            addMessage({ ...placeholder, content: m.content, executionState: "done" });
          }
        }
      })
      .catch((e) => {
        toast.error("Failed to load messages");
        console.warn("Failed to load messages", e);
      });
  }, [addMessage, clearMessages, setActiveConvId]);

	  const handleNewConversation = useCallback(async () => {
    try {
      const resp = await conversationsService.create(projectId, {
        title: "New Conversation",
        mode,
      });
      const newConv = resp.data as Conversation;
      const convItem: ConversationItem = {
        id: newConv.id,
        title: newConv.title,
        mode: newConv.mode,
        updatedAt: newConv.updated_at,
      };
      setConversations((prev) => [convItem, ...prev]);
      setActiveConvId(convItem.id);
      clearMessages();
    } catch (e) {
      toast.error("Failed to create conversation");
      console.warn("Failed to create conversation", e);
    }
  }, [projectId, mode, clearMessages, setActiveConvId]);

  return (
    <div className="flex h-full bg-surface-l0">
      {/* Conversation sidebar */}
      <ConversationList
        conversations={conversations}
        activeId={activeConvId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
      />

      {/* Main chat area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar: Mode selector + context toggle */}
        <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2 border-b border-theme-subtle">
          <ModeSelector />

          <div className="flex items-center gap-2">
            {error && (
              <span className="text-[12px] text-semantic-danger font-mono truncate max-w-50">
                {error}
              </span>
            )}

            {contextUsage && (
              <button
                onClick={() => setContextPanelOpen(!isContextPanelOpen)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-medium transition-colors ${
                  isContextPanelOpen
                    ? "bg-brand-accent-subtle text-brand-accent"
                    : "text-theme-tertiary hover:text-theme-secondary hover:bg-surface-hover"
                }`}
                title="Toggle context usage panel"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 20V10M18 20V4M6 20v-4" />
                </svg>
                <span>Usage</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <MessageStream />

        {/* Context panel */}
        <div className="shrink-0">
          <ContextPanel />
        </div>

        {/* Input */}
        <InputArea />
      </div>
    </div>
  );
});

export { AIConsole as default };
