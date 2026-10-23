"use client";

import { useCallback, useRef, useEffect, useState, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAIConsoleStore, createUserMessage, createAssistantPlaceholder } from "./store";
import { providersService, type ProviderConfig } from "@/lib/api/services/providers.service";
import { conversationsService } from "@/lib/api/services/conversations.service";
import { ModelSelectorDropdown } from "./model-selector-dropdown";

const PLACEHOLDERS: Record<string, string> = {
  fast: "Ask anything…",
  thinking: "Ask a question requiring reasoning…",
  planning: "Describe what you want to plan…",
  agent: "Ask AI to create, edit, or clean board…",
};

export const InputArea = memo(function InputArea() {
  const queryClient = useQueryClient();
  const input = useAIConsoleStore((s) => s.input);
  const setInput = useAIConsoleStore((s) => s.setInput);
  const mode = useAIConsoleStore((s) => s.mode);
  const projectId = useAIConsoleStore((s) => s.projectId);
  const isStreaming = useAIConsoleStore((s) => s.isStreaming);
  const setIsStreaming = useAIConsoleStore((s) => s.setIsStreaming);
  const selectedProviderId = useAIConsoleStore((s) => s.selectedProviderId);
  const activeConversationId = useAIConsoleStore((s) => s.activeConversationId);
  const addMessage = useAIConsoleStore((s) => s.addMessage);
  const updateMessage = useAIConsoleStore((s) => s.updateMessage);
  const setExecutionState = useAIConsoleStore((s) => s.setExecutionState);
  const setProgressDetail = useAIConsoleStore((s) => s.setProgressDetail);
  const setContextUsage = useAIConsoleStore((s) => s.setContextUsage);
  const setError = useAIConsoleStore((s) => s.setError);
  const setAbortController = useAIConsoleStore((s) => s.setAbortController);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);

  useEffect(() => {
    providersService
      .list()
      .then((list) => {
        setProviders(list);
        const current = useAIConsoleStore.getState().selectedProviderId;
        if (!current) {
          const def = list.find((p) => p.is_default);
          if (def) {
            useAIConsoleStore.getState().setSelectedProviderId(def.id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const addActivityToMessage = useAIConsoleStore((s) => s.addActivityToMessage);
  const setActiveConversationId = useAIConsoleStore((s) => s.setActiveConversationId);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    // Collect prior conversation history with Sliding Window (last 14 turns)
    const currentMessages = useAIConsoleStore.getState().messages;
    const historyPayload = currentMessages
      .filter((m) => m.content && m.content.trim() !== "" && m.executionState !== "error")
      .map((m) => ({ role: m.role, content: m.content }));
    const windowedHistory = historyPayload.length > 14 ? historyPayload.slice(-14) : historyPayload;
    const messagesToSend = [...windowedHistory, { role: "user", content: trimmed }];

    const userMsg = createUserMessage(trimmed);
    const assistantMsg = createAssistantPlaceholder();

    addMessage(userMsg);
    setInput("");
    setError(null);
    setExecutionState("idle");
    setIsStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    // Auto-create conversation if none is active
    let currentConvId = activeConversationId;
    if (!currentConvId && projectId) {
      try {
        const autoTitle = trimmed.length > 35 ? `${trimmed.slice(0, 35)}...` : trimmed;
        const resp = await conversationsService.create(projectId, {
          title: autoTitle,
          mode,
        });
        if (resp.data && resp.data.id) {
          currentConvId = resp.data.id;
          setActiveConversationId(currentConvId);
        }
      } catch (e) {
        console.warn("Failed to auto-create conversation", e);
      }
    }

    // Persist user message to the conversation
    if (currentConvId) {
      conversationsService
        .addMessage(currentConvId, { role: "user", content: trimmed })
        .catch((e) => console.warn("Failed to save user message", e));
    }

    try {
      // Add placeholder for streaming
      addMessage(assistantMsg);
      setExecutionState("streaming");
      updateMessage(assistantMsg.id, { executionState: "streaming" });

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          mode,
          provider_id: selectedProviderId || undefined,
          messages: messagesToSend,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE events — handle both \n and \r\n line endings
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            switch (parsed.type) {
              case "text":
                fullContent += parsed.content;
                updateMessage(assistantMsg.id, { content: fullContent });
                break;
              case "state":
                setExecutionState(parsed.state);
                if (parsed.details) {
                  setProgressDetail(parsed.details);
                }
                updateMessage(assistantMsg.id, {
                  executionState: parsed.state,
                });
                break;
              case "tool_call":
                addActivityToMessage(assistantMsg.id, {
                  id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  type: "tool_call",
                  name: parsed.name,
                  arguments: parsed.arguments,
                  status: "running",
                  timestamp: Date.now(),
                });
                break;
              case "tool_result": {
                addActivityToMessage(assistantMsg.id, {
                  id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  type: "tool_result",
                  name: parsed.name,
                  status: parsed.status === "error" ? "error" : "success",
                  result: parsed.result,
                  timestamp: Date.now(),
                });
                // Invalidate board/project/notebook cache immediately if tool modified data
                if (parsed.status !== "error" && typeof parsed.name === "string") {
                  const n = parsed.name.toLowerCase();
                  if (
                    n.startsWith("task_") ||
                    n.startsWith("column_") ||
                    n.startsWith("project_") ||
                    n.startsWith("kanban_") ||
                    n.startsWith("notebook_")
                  ) {
                    queryClient.invalidateQueries({ queryKey: ["projects"] });
                    queryClient.invalidateQueries({ queryKey: ["notebooks"] });
                    window.dispatchEvent(new CustomEvent("taskure:board-updated"));
                  }
                }
                break;
              }
              case "context":
                setContextUsage(parsed.usage);
                updateMessage(assistantMsg.id, {
                  contextUsage: parsed.usage,
                });
                break;
              case "error":
                setError(parsed.message);
                updateMessage(assistantMsg.id, {
                  executionState: "error",
                  content: parsed.message || "An error occurred",
                });
                break;
            }
          } catch (e) {
            console.warn("SSE parse error", e);
          }
        }
      }

      setExecutionState("done");
      updateMessage(assistantMsg.id, { executionState: "done" });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      window.dispatchEvent(new CustomEvent("taskure:board-updated"));

      // Persist the assistant message once streaming finishes.
      if (currentConvId && fullContent) {
        conversationsService
          .addMessage(currentConvId, {
            role: "assistant",
            content: fullContent,
          })
          .catch((e) => console.warn("Failed to save assistant message", e));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const message = (err as Error).message || "Failed to send message";
      setError(message);
      setExecutionState("error");
      updateMessage(assistantMsg.id, {
        content: message,
        executionState: "error",
      });
    } finally {
      setAbortController(null);
      setIsStreaming(false);
    }
  }, [input, isStreaming, projectId, mode, activeConversationId, selectedProviderId, addMessage, updateMessage, addActivityToMessage, setActiveConversationId, setInput, setExecutionState, setProgressDetail, setContextUsage, setError, setAbortController, setIsStreaming]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const abortController = useAIConsoleStore((s) => s.abortController);

  const handleStop = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
      setExecutionState("idle");
    }
  }, [abortController, setAbortController, setIsStreaming, setExecutionState]);

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto w-full">
        {/* Model selector & active indicator */}
        <div className="flex items-center justify-between mb-2 px-1 text-[11.5px] text-theme-tertiary">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-semantic-success" />
            <span className="capitalize">{mode} Mode</span>
          </div>

          {providers.length > 0 && (
            <ModelSelectorDropdown
              providers={providers}
              selectedProviderId={selectedProviderId}
              onSelectProvider={(id) => useAIConsoleStore.getState().setSelectedProviderId(id)}
              disabled={isStreaming}
            />
          )}
        </div>

        {/* Input Card Container */}
        <div className="flex items-end gap-2 bg-surface-l1 border border-theme-subtle focus-within:border-brand-accent/60 focus-within:ring-1 focus-within:ring-brand-accent/20 rounded-2xl p-2.5 transition-all shadow-xs">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDERS[mode] || "Ask anything…"}
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-[14.5px] text-theme-primary placeholder:text-theme-tertiary outline-none resize-none min-h-6 max-h-40 px-2 py-0.5 leading-relaxed"
          />

          {isStreaming ? (
            <button
              onClick={handleStop}
              className="shrink-0 h-8 px-3 flex items-center gap-1.5 rounded-xl bg-semantic-danger/10 hover:bg-semantic-danger/20 text-semantic-danger border border-semantic-danger/30 text-[12px] font-medium transition-all active:scale-95 cursor-pointer"
              title="Stop response"
            >
              <span className="w-2 h-2 rounded-xs bg-semantic-danger" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-brand-accent text-text-on-accent disabled:opacity-20 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
              aria-label="Send message"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
