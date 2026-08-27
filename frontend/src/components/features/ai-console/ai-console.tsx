"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
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
  const prevProjectIdRef = useRef<string>("");

  // Fetch conversations for the current project. Reset state ONLY when switching projects.
  useEffect(() => {
    if (!projectId) return;

    if (prevProjectIdRef.current !== projectId) {
      prevProjectIdRef.current = projectId;
      setConversations([]);
      setActiveConvId(null);
      clearMessages();
      setError(null);
      setContextUsage(null);
    }

    conversationsService
      .list(projectId)
      .then((data) => setConversations(data.map(toConversationItem)))
      .catch((e) => {
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

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await conversationsService.delete(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConvId === id) {
          setActiveConvId(null);
          clearMessages();
        }
        toast.success("Conversation deleted");
      } catch (e) {
        toast.error("Failed to delete conversation");
        console.warn("Failed to delete conversation", e);
      }
    },
    [activeConvId, clearMessages, setActiveConvId]
  );

  const isHistorySidebarOpen = useAIConsoleStore((s) => s.isHistorySidebarOpen);
  const toggleHistorySidebar = useAIConsoleStore((s) => s.toggleHistorySidebar);
  const isFullView = useAIConsoleStore((s) => s.isFullView);
  const toggleFullView = useAIConsoleStore((s) => s.toggleFullView);

  return (
    <div className="flex h-full bg-surface-l0 relative overflow-hidden">
      {/* Conversation sidebar (closed by default, opened via burger menu) */}
      {isHistorySidebarOpen && (
        <div className="absolute inset-y-0 left-0 z-20 w-64 shadow-xl md:relative md:shadow-none bg-surface-l1 transition-all duration-200">
          <ConversationList
            conversations={conversations}
            activeId={activeConvId}
            onSelect={(id) => {
              handleSelectConversation(id);
              // Close history sidebar after selection on smaller screens
              if (window.innerWidth < 768) toggleHistorySidebar();
            }}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        {/* Top bar: Burger sidebar toggle + Mode selector + Full view toggle */}
        <div className="shrink-0 flex items-center justify-between px-3.5 pt-3 pb-2 bg-surface-l1/30 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleHistorySidebar}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isHistorySidebarOpen
                  ? "bg-brand-accent-subtle text-brand-accent"
                  : "bg-surface-l2 text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
              }`}
              title={isHistorySidebarOpen ? "Close chat history" : "Open chat history"}
              aria-label="Toggle chat history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            <ModeSelector />
          </div>

          <div className="flex items-center gap-2">
            {error && (
              <span className="text-[11px] text-semantic-danger font-mono truncate max-w-40" title={error}>
                {error}
              </span>
            )}

            {contextUsage && (
              <button
                onClick={() => setContextPanelOpen(!isContextPanelOpen)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  isContextPanelOpen
                    ? "bg-brand-accent-subtle text-brand-accent"
                    : "text-theme-tertiary hover:text-theme-secondary hover:bg-surface-hover"
                }`}
                title="Toggle context usage panel"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 20V10M18 20V4M6 20v-4" />
                </svg>
                <span>Usage</span>
              </button>
            )}

            {/* Full View Toggle */}
            <button
              onClick={toggleFullView}
              className="p-1.5 rounded-lg bg-surface-l2 text-theme-secondary hover:text-theme-primary hover:bg-surface-hover transition-colors cursor-pointer"
              title={isFullView ? "Exit Full View" : "Full View (1 Viewport)"}
              aria-label="Toggle full view"
            >
              {isFullView ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 5l5 5m0 0l-5 0m5 0l0-5m0-11l-5 5m5-5l-5 0m5 0l0 5m-11 11l-5-5m0 0l5 0m-5 0l0-5" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
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
