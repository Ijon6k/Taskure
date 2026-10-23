"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  Trash2,
  Settings2,
  FlaskConical,
  Eye,
  EyeOff,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { providersService, type ProviderConfig } from "@/lib/api/services/providers.service";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/inputs/select";

interface ProviderEntry {
  id: string;
  provider: string;
  model: string;
  apiKey: string;
  endpoint?: string;
  isDefault: boolean;
  advanced?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    streaming?: boolean;
    timeout?: number;
  };
}

function fromApiConfig(cfg: ProviderConfig): ProviderEntry {
  const entry: ProviderEntry = {
    id: cfg.id,
    provider: cfg.provider,
    model: cfg.model,
    apiKey: "",
    isDefault: cfg.is_default,
  };

  if (cfg.endpoint !== undefined && cfg.endpoint !== null && cfg.endpoint !== "") {
    entry.endpoint = cfg.endpoint;
  }

  if (cfg.config) {
    const adv: NonNullable<ProviderEntry["advanced"]> = {};
    const c = cfg.config;
    if (typeof c.temperature === "number") adv.temperature = c.temperature;
    if (typeof c.top_p === "number") adv.topP = c.top_p;
    if (typeof c.max_tokens === "number") adv.maxTokens = c.max_tokens;
    if (typeof c.streaming === "boolean") adv.streaming = c.streaming;
    if (typeof c.timeout === "number") adv.timeout = c.timeout;
    if (Object.keys(adv).length > 0) entry.advanced = adv;
  }

  return entry;
}

const PROVIDER_OPTIONS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Groq",
  "OpenRouter",
  "Ollama",
  "Custom",
] as const;

const EMPTY_ADVANCED = {
  temperature: 0.7,
  topP: 1,
  maxTokens: 4096,
  streaming: true,
  timeout: 60,
};

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••" + key.slice(-4);
}

export function AIProviderSettings() {
  const [providers, setProviders] = useState<ProviderEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch providers on mount
  useEffect(() => {
    providersService
      .list()
      .then((data) => setProviders(data.map(fromApiConfig)))
      .catch((e) => {
        toast.error("Failed to load providers");
        console.warn("Failed to load providers", e);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const refreshProviders = useCallback(() => {
    providersService
      .list()
      .then((data) => setProviders(data.map(fromApiConfig)))
      .catch((e) => {
        toast.error("Failed to refresh providers");
        console.warn("Failed to refresh providers", e);
      });
  }, []);

  // ── Form state ──
  const [formProvider, setFormProvider] = useState<string>("OpenAI");
  const [formApiKey, setFormApiKey] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formAdvanced, setFormAdvanced] = useState(false);
  const [formAdvConfig, setFormAdvConfig] = useState({ ...EMPTY_ADVANCED });

  const resetForm = useCallback(() => {
    setFormProvider("OpenAI");
    setFormApiKey("");
    setFormModel("");
    setFormEndpoint("");
    setFormIsDefault(false);
    setFormAdvanced(false);
    setFormAdvConfig({ ...EMPTY_ADVANCED });
  }, []);

  const handleAdd = useCallback(async () => {
    if (!formProvider || !formApiKey || !formModel) return;

    try {
      await providersService.create({
        provider: formProvider,
        api_key: formApiKey,
        model: formModel,
        ...(formEndpoint ? { endpoint: formEndpoint } : {}),
        is_default: formIsDefault,
        ...(formAdvanced
          ? {
              config: {
                temperature: formAdvConfig.temperature,
                top_p: formAdvConfig.topP,
                max_tokens: formAdvConfig.maxTokens,
                streaming: formAdvConfig.streaming,
                timeout: formAdvConfig.timeout,
              },
            }
          : {}),
      });

      resetForm();
      setIsAdding(false);
      toast.success(`Provider "${formProvider}" added.`);
      refreshProviders();
    } catch (e) {
      toast.error("Failed to create provider");
      console.warn("Failed to create provider", e);
    }
  }, [formProvider, formApiKey, formModel, formEndpoint, formIsDefault, formAdvanced, formAdvConfig, resetForm, refreshProviders]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await providersService.delete(id);
      setDeleteConfirm(null);
      toast.success("Provider removed.");
      refreshProviders();
    } catch (e) {
      toast.error("Failed to remove provider");
      console.warn("Failed to remove provider", e);
    }
  }, [refreshProviders]);

  const handleTest = useCallback(async (id: string) => {
    setTestingId(id);
    try {
      await providersService.test(id);
      toast.success("Connection test passed.");
    } catch (e) {
      toast.error("Connection test failed");
      console.warn("Connection test failed", e);
    } finally {
      setTestingId(null);
    }
  }, []);

  const toggleShowKey = useCallback((id: string) => {
    setShowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-theme-primary">
            AI Providers
          </h3>
          <p className="text-[14px] text-theme-secondary mt-0.5">
            Configure API keys and model settings for external AI providers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsAdding(!isAdding);
          }}
          className="px-3.5 py-2 rounded-md bg-surface-l2 hover:bg-surface-l3 text-brand-accent text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Provider</span>
        </button>
      </div>

      {/* Add Provider Form */}
      {isAdding && (
        <div className="p-4 bg-surface-l2 rounded-md space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-theme-primary uppercase tracking-wider">
              New Provider
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1 rounded hover:bg-surface-l3 text-theme-tertiary hover:text-theme-primary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Provider Select */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-theme-tertiary uppercase tracking-wider">
                Provider
              </label>
              <Select value={formProvider} onValueChange={(val) => setFormProvider(val)}>
                <SelectTrigger className="w-full bg-surface-l3 border border-theme-subtle h-[38px]">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-theme-tertiary uppercase tracking-wider">
                Model
              </label>
              <input
                type="text"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                placeholder="e.g. claude-sonnet-4-20250514"
                className="w-full bg-surface-l3 border border-theme-subtle rounded-md px-3 py-2 text-[14px] text-theme-primary placeholder:text-theme-tertiary outline-none focus:ring-2 focus:ring-brand-accent/20"
              />
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-theme-tertiary uppercase tracking-wider">
                API Key
              </label>
              <input
                type="password"
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                className="w-full bg-surface-l3 border border-theme-subtle rounded-md px-3 py-2 text-[14px] text-theme-primary placeholder:text-theme-tertiary outline-none focus:ring-2 focus:ring-brand-accent/20"
              />
            </div>

            {/* Endpoint */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-theme-tertiary uppercase tracking-wider">
                Endpoint <span className="text-theme-tertiary/60">(optional)</span>
              </label>
              <input
                type="text"
                value={formEndpoint}
                onChange={(e) => setFormEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-surface-l3 border border-theme-subtle rounded-md px-3 py-2 text-[14px] text-theme-primary placeholder:text-theme-tertiary outline-none focus:ring-2 focus:ring-brand-accent/20"
              />
            </div>
          </div>

          {/* Default + Advanced toggle row */}
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-[13px] text-theme-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="rounded bg-surface-l3 border-theme-subtle text-brand-accent"
              />
              Set as default
            </label>

            <button
              type="button"
              onClick={() => setFormAdvanced(!formAdvanced)}
              className={`text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                formAdvanced ? "text-brand-accent" : "text-theme-tertiary hover:text-theme-secondary"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Advanced
            </button>
          </div>

          {/* Advanced config */}
          {formAdvanced && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 p-4 bg-surface-l3 rounded-md">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-theme-tertiary uppercase">
                  Temperature
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formAdvConfig.temperature}
                  onChange={(e) =>
                    setFormAdvConfig((prev) => ({
                      ...prev,
                      temperature: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-brand-accent"
                />
                <span className="text-[12px] text-theme-tertiary font-mono">
                  {formAdvConfig.temperature.toFixed(1)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-theme-tertiary uppercase">
                  Top P
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formAdvConfig.topP}
                  onChange={(e) =>
                    setFormAdvConfig((prev) => ({
                      ...prev,
                      topP: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-brand-accent"
                />
                <span className="text-[12px] text-theme-tertiary font-mono">
                  {formAdvConfig.topP.toFixed(2)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-theme-tertiary uppercase">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min={1}
                  max={200000}
                  value={formAdvConfig.maxTokens}
                  onChange={(e) =>
                    setFormAdvConfig((prev) => ({
                      ...prev,
                      maxTokens: parseInt(e.target.value, 10) || 4096,
                    }))
                  }
                  className="w-full bg-surface-l4 border border-theme-subtle rounded-md px-2.5 py-1.5 text-[13px] text-theme-primary outline-none focus:ring-2 focus:ring-brand-accent/20 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-theme-tertiary uppercase">
                  Streaming
                </label>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAdvConfig.streaming}
                    onChange={(e) =>
                      setFormAdvConfig((prev) => ({
                        ...prev,
                        streaming: e.target.checked,
                      }))
                    }
                    className="rounded bg-surface-l3 border-theme-subtle text-brand-accent"
                  />
                  <span className="text-[13px] text-theme-secondary">
                    {formAdvConfig.streaming ? "Enabled" : "Disabled"}
                  </span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-theme-tertiary uppercase">
                  Timeout (s)
                </label>
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={formAdvConfig.timeout}
                  onChange={(e) =>
                    setFormAdvConfig((prev) => ({
                      ...prev,
                      timeout: parseInt(e.target.value, 10) || 60,
                    }))
                  }
                  className="w-full bg-surface-l4 border border-theme-subtle rounded-md px-2.5 py-1.5 text-[13px] text-theme-primary outline-none focus:ring-2 focus:ring-brand-accent/20 font-mono"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!formProvider || !formApiKey || !formModel}
              className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-slate-950 font-semibold text-[13px] rounded-md transition-all disabled:opacity-40 cursor-pointer"
            >
              Save Provider
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-[13px] font-medium text-theme-secondary hover:text-theme-primary bg-surface-l3 hover:bg-surface-l4 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Provider List */}
      {providers.length > 0 && (
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className="p-4 bg-surface-l2 rounded-md space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-theme-primary">
                        {p.provider}
                      </span>
                      {p.isDefault && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-brand-accent/15 text-brand-accent uppercase tracking-wider">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] text-theme-secondary font-mono">
                      {p.model}
                    </span>
                  </div>
                </div>

                {/* Key display */}
                <div className="flex items-center gap-2">
                  <code className="text-[13px] text-theme-tertiary font-mono bg-surface-l3 px-2 py-1 rounded">
                    {showKeys.has(p.id) ? p.apiKey : maskKey(p.apiKey)}
                  </code>
                  <button
                    type="button"
                    onClick={() => toggleShowKey(p.id)}
                    className="p-1 rounded hover:bg-surface-l3 text-theme-tertiary hover:text-theme-secondary transition-colors cursor-pointer"
                    title={showKeys.has(p.id) ? "Hide key" : "Show key"}
                  >
                    {showKeys.has(p.id) ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Advanced info */}
              {p.advanced && (
                <div className="flex items-center gap-4 text-[12px] text-theme-tertiary">
                  <span>
                    temp: {p.advanced.temperature}
                  </span>
                  <span>
                    top_p: {p.advanced.topP}
                  </span>
                  <span>
                    max_tokens: {p.advanced.maxTokens}
                  </span>
                  <span>
                    streaming: {p.advanced.streaming ? "on" : "off"}
                  </span>
                  <span>
                    timeout: {p.advanced.timeout}s
                  </span>
                </div>
              )}

              {/* Endpoint if set */}
              {p.endpoint && (
                <div className="text-[12px] text-theme-tertiary font-mono truncate">
                  {p.endpoint}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTest(p.id)}
                  disabled={testingId === p.id}
                  className="px-3 py-1.5 bg-surface-l3 hover:bg-surface-l4 text-theme-secondary hover:text-theme-primary text-[12px] font-medium rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {testingId === p.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <FlaskConical className="w-3 h-3" />
                  )}
                  <span>Test Connection</span>
                </button>

                {deleteConfirm === p.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-red-400 font-medium">
                      Confirm delete?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[12px] font-semibold rounded cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-1 bg-surface-l3 hover:bg-surface-l4 text-theme-secondary text-[12px] font-medium rounded cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(p.id)}
                    className="px-3 py-1.5 text-[12px] font-medium text-theme-tertiary hover:text-red-400 rounded-md hover:bg-red-500/5 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="p-6 bg-surface-l2 rounded-md text-center">
          <Loader2 className="w-4 h-4 animate-spin mx-auto text-theme-tertiary" />
          <p className="text-[13px] text-theme-tertiary mt-2">
            Loading providers…
          </p>
        </div>
      )}

      {!isLoading && providers.length === 0 && !isAdding && (
        <div className="p-6 bg-surface-l2 rounded-md text-center">
          <p className="text-[13px] text-theme-tertiary italic">
            No AI providers configured. Add one to enable the AI assistant.
          </p>
        </div>
      )}
    </div>
  );
}
