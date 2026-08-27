"use client";

import { useCallback, useRef, useEffect, useState, memo } from "react";
import { useAIConsoleStore, createUserMessage, createAssistantPlaceholder } from "./store";
import { providersService, type ProviderConfig } from "@/lib/api/services/providers.service";
import { conversationsService } from "@/lib/api/services/conversations.service";

const PLACEHOLDERS: Record<string, string> = {
  fast: "Ask anything — quick answers…",
  thinking: "Ask something that needs careful thought…",
  planning: "Describe what you need planned…",
  agent: "Give me a task to work on…",
};

export const InputArea = memo(function InputArea() {
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
  const setContextUsage = useAIConsoleStore((s) => s.setContextUsage);
  const setError = useAIConsoleStore((s) => s.setError);
  const setAbortController = useAIConsoleStore((s) => s.setAbortController);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);

  useEffect(() => {
    providersService.list().then(setProviders).catch(() => {});
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  	const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg = createUserMessage(trimmed);
    const assistantMsg = createAssistantPlaceholder();

    addMessage(userMsg);
    setInput("");
    setError(null);
    setExecutionState("idle");
    setIsStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    // Persist the user message to the active conversation (sessions).
    if (activeConversationId) {
      conversationsService
        .addMessage(activeConversationId, { role: "user", content: trimmed })
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
          messages: [{ role: "user", content: trimmed }],
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
                updateMessage(assistantMsg.id, {
                  executionState: parsed.state,
                });
                break;
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

      // Persist the assistant message once streaming finishes.
      if (activeConversationId && fullContent) {
        conversationsService
          .addMessage(activeConversationId, {
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
  }, [input, isStreaming, projectId, mode, activeConversationId, selectedProviderId, addMessage, updateMessage, setInput, setExecutionState, setContextUsage, setError, setAbortController, setIsStreaming]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      {/* Provider selector */}
      {providers.length > 0 && (
        <div className="flex items-center justify-end gap-2 mb-2">
          <span className="text-[11px] font-medium text-theme-tertiary uppercase tracking-wider">
            Model
          </span>
          <select
            value={selectedProviderId}
            onChange={(e) => useAIConsoleStore.getState().setSelectedProviderId(e.target.value)}
            className="bg-surface-l2 border border-theme-subtle rounded-md px-2 py-1 text-[13px] text-theme-primary outline-none focus:ring-1 focus:ring-brand-accent/30"
          >
            <option value="">None (env vars)</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.provider} — {p.model}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-end gap-2 bg-surface-l2 border border-theme-default rounded-xl px-3 py-2 focus-within:border-accent transition-colors duration-150">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[mode] || "Ask anything…"}
          rows={1}
          disabled={isStreaming}
          className="flex-1 bg-transparent text-[15px] text-theme-primary placeholder:text-theme-tertiary outline-none resize-none min-h-6 max-h-40 py-0.5"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-brand-accent text-text-on-accent disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all"
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
      </div>
    </div>
  );
});
