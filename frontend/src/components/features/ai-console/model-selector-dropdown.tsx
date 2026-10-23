"use client";

import { useMemo } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Sparkles, Bot } from "lucide-react";
import type { ProviderConfig } from "@/lib/api/services/providers.service";

interface ModelSelectorDropdownProps {
  providers: ProviderConfig[];
  selectedProviderId: string | null;
  onSelectProvider: (id: string) => void;
  disabled?: boolean;
}

function getProviderTheme(providerName: string): { bg: string; text: string; dot: string; label: string } {
  const p = providerName.toLowerCase();
  if (p.includes("openai") || p.includes("gpt")) {
    return {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
      label: "OpenAI",
    };
  }
  if (p.includes("anthropic") || p.includes("claude")) {
    return {
      bg: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-400",
      dot: "bg-amber-400",
      label: "Anthropic",
    };
  }
  if (p.includes("google") || p.includes("gemini")) {
    return {
      bg: "bg-sky-500/10 border-sky-500/20",
      text: "text-sky-400",
      dot: "bg-sky-400",
      label: "Google",
    };
  }
  if (p.includes("groq")) {
    return {
      bg: "bg-orange-500/10 border-orange-500/20",
      text: "text-orange-400",
      dot: "bg-orange-400",
      label: "Groq",
    };
  }
  if (p.includes("ollama")) {
    return {
      bg: "bg-purple-500/10 border-purple-500/20",
      text: "text-purple-400",
      dot: "bg-purple-400",
      label: "Ollama",
    };
  }
  if (p.includes("openrouter")) {
    return {
      bg: "bg-indigo-500/10 border-indigo-500/20",
      text: "text-indigo-400",
      dot: "bg-indigo-400",
      label: "OpenRouter",
    };
  }
  return {
    bg: "bg-brand-accent/10 border-brand-accent/20",
    text: "text-brand-accent",
    dot: "bg-brand-accent",
    label: providerName || "Custom",
  };
}

export function ModelSelectorDropdown({
  providers,
  selectedProviderId,
  onSelectProvider,
  disabled = false,
}: ModelSelectorDropdownProps) {
  const currentProvider = useMemo(() => {
    if (!selectedProviderId) return null;
    return providers.find((p) => p.id === selectedProviderId) || null;
  }, [providers, selectedProviderId]);

  const defaultProvider = useMemo(() => {
    return providers.find((p) => p.is_default) || null;
  }, [providers]);

  const activeTheme = useMemo(() => {
    if (!currentProvider) {
      return defaultProvider
        ? getProviderTheme(defaultProvider.provider)
        : {
            bg: "bg-brand-accent/10 border-brand-accent/20",
            text: "text-brand-accent",
            dot: "bg-brand-accent",
            label: "Auto",
          };
    }
    return getProviderTheme(currentProvider.provider);
  }, [currentProvider, defaultProvider]);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-l2 hover:bg-surface-l3 border border-theme-subtle text-[12px] font-medium text-theme-secondary hover:text-theme-primary transition-all duration-150 cursor-pointer outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Select AI Model"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeTheme.dot} shrink-0 animate-pulse`} />
          <span className="text-[11px] font-mono uppercase tracking-wider text-theme-tertiary">
            {activeTheme.label}
          </span>
          <span className="text-theme-tertiary/40">/</span>
          <span className="font-semibold text-theme-primary truncate max-w-[140px] sm:max-w-[200px]">
            {currentProvider ? currentProvider.model : "Auto (Default)"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-theme-tertiary group-hover:text-theme-secondary transition-transform duration-150 shrink-0 ml-0.5" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-72 max-h-80 overflow-y-auto rounded-xl bg-surface-l4 border border-theme-default p-1.5 shadow-elevation-l4 animate-in fade-in-0 zoom-in-95 duration-120 select-none text-theme-primary"
        >
          <div className="px-2.5 py-1.5 text-[10.5px] font-mono font-semibold uppercase tracking-wider text-theme-tertiary flex items-center justify-between border-b border-theme-subtle mb-1">
            <span>Available AI Models</span>
            <span className="text-[10px] text-theme-tertiary lowercase font-normal">
              {providers.length + 1} options
            </span>
          </div>

          {/* Auto / Default Option */}
          <DropdownMenu.Item
            onSelect={() => onSelectProvider("")}
            className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[12.5px] font-medium outline-none cursor-pointer transition-colors ${
              !selectedProviderId
                ? "bg-surface-hover text-theme-primary font-semibold"
                : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-theme-primary font-semibold">Auto (Default Provider)</span>
                <span className="text-[11px] text-theme-tertiary truncate">
                  {defaultProvider
                    ? `${defaultProvider.provider} · ${defaultProvider.model}`
                    : "Uses server default / .env config"}
                </span>
              </div>
            </div>
            {!selectedProviderId && (
              <Check className="w-4 h-4 text-brand-accent shrink-0" />
            )}
          </DropdownMenu.Item>

          {/* Separator if providers exist */}
          {providers.length > 0 && (
            <div className="h-px bg-theme-subtle my-1" />
          )}

          {/* List of Configured Providers */}
          {providers.map((p) => {
            const isSelected = selectedProviderId === p.id;
            const theme = getProviderTheme(p.provider);

            return (
              <DropdownMenu.Item
                key={p.id}
                onSelect={() => onSelectProvider(p.id)}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[12.5px] font-medium outline-none cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-surface-hover text-theme-primary font-semibold"
                    : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${theme.bg} ${theme.text}`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-theme-primary">
                        {p.model}
                      </span>
                      {p.is_default && (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono uppercase bg-surface-l2 text-theme-tertiary border border-theme-subtle">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-theme-tertiary truncate">
                      {theme.label}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-brand-accent shrink-0" />
                )}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
