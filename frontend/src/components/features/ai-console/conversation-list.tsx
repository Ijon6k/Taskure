"use client";

import { useMemo, memo } from "react";
import { Plus, ChatCircle, Trash } from "@phosphor-icons/react";

export interface ConversationItem {
  id: string;
  title: string;
  mode: "fast" | "thinking" | "planning" | "agent";
  lastMessage?: string;
  updatedAt: string;
}

const MODE_BADGE: Record<ConversationItem["mode"], { label: string; className: string }> = {
  fast: { label: "Fast", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  thinking: { label: "Think", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  planning: { label: "Plan", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  agent: { label: "Agent", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface ConversationListProps {
  conversations: ConversationItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete?: (id: string) => void;
}

export const ConversationList = memo(function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ConversationListProps) {
  const sorted = useMemo(
    () => [...conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [conversations]
  );

  return (
    <div className="shrink-0 flex flex-col bg-surface-l1/80 w-64">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3.5 py-3">
        <span className="text-[11px] font-semibold text-theme-tertiary uppercase tracking-wider">
          Conversations
        </span>
      </div>

      {/* New Conversation Button */}
      <div className="shrink-0 px-3 pb-2">
        <button
          type="button"
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-surface-l2 hover:bg-surface-l3 text-[13px] font-medium text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-1">
        {sorted.length === 0 && (
          <div className="px-3 py-8 text-center">
            <ChatCircle className="w-5 h-5 text-theme-tertiary/40 mx-auto mb-2" />
            <p className="text-[12px] text-theme-tertiary italic">
              No conversations yet.
            </p>
          </div>
        )}

        {sorted.map((conv) => {
          const isActive = conv.id === activeId;
          const badge = MODE_BADGE[conv.mode];
          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-3 py-2.5 rounded-md transition-colors cursor-pointer group relative ${
                isActive
                  ? "bg-surface-l3 border border-theme-default"
                  : "hover:bg-surface-l2 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-6">
                <span
                  className={`text-[13px] font-medium truncate flex-1 ${
                    isActive ? "text-theme-primary" : "text-theme-secondary"
                  }`}
                >
                  {conv.title}
                </span>
                <span
                  className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${
                    badge.className
                  }`}
                >
                  {badge.label}
                </span>
              </div>

              {conv.lastMessage && (
                <p className="text-[12px] text-theme-tertiary truncate mt-1 leading-snug">
                  {conv.lastMessage}
                </p>
              )}

              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-theme-tertiary/60 block">
                  {relativeTime(conv.updatedAt)}
                </span>
                {onDelete && (
                  <button
                    type="button"
                    title="Delete conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-l3 hover:text-semantic-danger text-theme-tertiary transition-all cursor-pointer"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
