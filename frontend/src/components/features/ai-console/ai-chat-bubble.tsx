"use client";

import { useEffect, memo } from "react";
import { useParams } from "next/navigation";
import { Sparkles, X, Bot } from "lucide-react";
import { useAIConsoleStore } from "./store";
import { AIConsole } from "./ai-console";

export const AIChatBubble = memo(function AIChatBubble() {
  const params = useParams<{ id?: string }>();
  const projectId = params?.id || "";

  const isBubbleOpen = useAIConsoleStore((s) => s.isBubbleOpen);
  const toggleBubble = useAIConsoleStore((s) => s.toggleBubble);
  const isFullView = useAIConsoleStore((s) => s.isFullView);
  const setProjectId = useAIConsoleStore((s) => s.setProjectId);

  useEffect(() => {
    if (projectId) {
      setProjectId(projectId);
    }
  }, [projectId, setProjectId]);

  // Don't render bubble if not in a project context
  if (!projectId) return null;

  return (
    <>
      {/* Expanded Chat Widget Container */}
      {isBubbleOpen && (
        <div
          className={
            isFullView
              ? "fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-3 md:p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200"
              : "fixed bottom-20 right-6 z-50 w-[480px] max-w-[calc(100vw-2rem)] h-[768px] max-h-[calc(100vh-3.5rem)] rounded-2xl shadow-2xl shadow-black/90 ring-1 ring-white/10 bg-surface-l0 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200"
          }
        >
          {/* Header Close Bar (in bubble mode) */}
          <div className="shrink-0 flex items-center justify-between px-3.5 py-2 bg-surface-l1/40 text-xs font-mono text-theme-tertiary">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-brand-accent" />
              <span className="font-semibold text-theme-primary">AI Assistant</span>
            </div>
            <button
              onClick={toggleBubble}
              className="p-1 rounded-md hover:bg-surface-hover text-theme-tertiary hover:text-theme-primary transition-colors cursor-pointer"
              title="Close chat bubble"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Console Content */}
          <div className="flex-1 min-h-0">
            <AIConsole />
          </div>
        </div>
      )}

      {/* Floating Trigger Button (Bottom-Right) */}
      <button
        onClick={toggleBubble}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer ${
          isBubbleOpen
            ? "bg-surface-l2 text-theme-primary hover:bg-surface-hover shadow-black/50"
            : "bg-brand-accent text-text-on-accent hover:brightness-110 shadow-brand-accent/20"
        }`}
        aria-label="Toggle AI Assistant"
        title="AI Assistant Chat"
      >
        {isBubbleOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-semantic-success border-2 border-surface-l0" />
          </div>
        )}
      </button>
    </>
  );
});
