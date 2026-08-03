"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  FileCode,
  Upload,
  Clipboard,
  Sparkles,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  RotateCcw,
  Wand2,
  Eye,
  Layers,
  LayoutGrid,
} from "lucide-react";
import { ModalContainer } from "@/components/ui/modal-container";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { applyImportCreate, parseImportJSON, ParsedImport } from "@/lib/workspace-backup";
import { IMPORT_AI_EXAMPLE, IMPORT_AI_PROMPT, buildAiPromptWithExample } from "@/lib/import-template";
import { ProjectData } from "@/lib/api";
import { cn } from "@/lib/utils";

type InputTab = "paste" | "upload" | "template";
type CopiedFlag = "prompt" | "example" | "both" | null;

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "replace";
  project?: ProjectData | null;
  onReady?: (parsed: ParsedImport) => void;
  onSuccess?: (project: ProjectData) => void;
}

export function ImportJsonModal({ isOpen, onClose, mode, project, onReady, onSuccess }: ImportJsonModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<InputTab>("paste");
  const [jsonText, setJsonText] = useState("");
  const [step, setStep] = useState<"input" | "preview">("input");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptText, setPromptText] = useState(IMPORT_AI_PROMPT);
  const [copiedFlag, setCopiedFlag] = useState<CopiedFlag>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset transient state every time the modal opens; keep the pasted text so
  // "Edit JSON" from the board preview restores it.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setStep("input");
    setParsed(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const copyText = useCallback((text: string, flag: CopiedFlag) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedFlag(flag);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopiedFlag(null), 2000);
      })
      .catch(() => toast.error("Failed to copy to clipboard."));
  }, []);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.warning("Clipboard is empty");
        return;
      }
      setJsonText(text);
      setError(null);
      toast.success("Pasted JSON from clipboard!");
    } catch {
      toast.error("Failed to read clipboard. Please paste manually.");
    }
  };

  const handleFormatJson = () => {
    if (!jsonText.trim()) return;
    try {
      const parsedJson = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsedJson, null, 2));
      setError(null);
      toast.success("JSON formatted successfully!");
    } catch {
      setError("Invalid JSON syntax. Cannot format.");
      toast.error("Invalid JSON syntax.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        JSON.parse(text);
        setJsonText(text);
        setError(null);
        toast.success(`File "${file.name}" loaded successfully!`);
      } catch {
        setError("Invalid JSON file syntax. Please ensure the file is valid JSON.");
        toast.error("Invalid JSON file syntax.");
      }
    };
    reader.readAsText(file);
  };

  const handlePreview = () => {
    if (!jsonText.trim()) {
      setError("Please paste JSON content or upload a JSON file.");
      return;
    }
    setError(null);
    try {
      const result = parseImportJSON(jsonText);
      if (mode === "replace") {
        if (!project) {
          setError("The board is still loading — try again in a moment.");
          return;
        }
        onReady?.(result);
        onClose();
        return;
      }
      setParsed(result);
      setStep("preview");
    } catch (err: any) {
      const msg = err.message || "Invalid JSON.";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleCreate = async () => {
    if (!parsed) return;
    setIsImporting(true);
    setError(null);
    try {
      const result = await applyImportCreate(parsed);
      await queryClient.invalidateQueries();
      toast.success(`Project "${result.project.name}" created with ${result.tasksAdded} tasks.`);
      setJsonText("");
      onSuccess?.(result.project);
      onClose();
    } catch (err: any) {
      const msg = err.message || "Failed to create project.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const lineCount = useMemo(() => jsonText.split("\n").length, [jsonText]);
  const byteSize = useMemo(
    () => (jsonText ? (new Blob([jsonText]).size / 1024).toFixed(1) : "0"),
    [jsonText]
  );

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-[560px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-accent-subtle flex items-center justify-center text-accent shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[20px] font-semibold text-theme-primary tracking-tight leading-none">Import JSON</h2>
            <p className="text-[12px] text-theme-secondary mt-1">
              {mode === "replace"
                ? `Replace the board of "${project?.name ?? "this project"}" — no new project is created`
                : "Create a new project from JSON"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-md text-theme-tertiary hover:text-theme-primary hover:bg-surface-l4 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-5 pt-3">
        {step === "input" ? (
          <>
            {/* Input mode tabs */}
            <div className="p-1 bg-surface-l4 rounded-md flex gap-1 text-[13px]">
              <TabButton active={tab === "paste"} onClick={() => setTab("paste")}>
                Paste Code
              </TabButton>
              <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
                Upload File
              </TabButton>
              <TabButton active={tab === "template"} onClick={() => setTab("template")}>
                <Wand2 className="w-3.5 h-3.5" />
                Template AI
              </TabButton>
            </div>

            {tab === "paste" && (
              <div className="space-y-1.5">
                <textarea
                  rows={8}
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setError(null);
                  }}
                  placeholder={`{\n  "name": "My Project",\n  "description": "JSON spec from ChatGPT / Claude",\n  "columns": [\n    { "name": "Todo", "tasks": ["First task"] }\n  ]\n}`}
                  className="w-full font-mono text-[12px] bg-surface-l4 focus:bg-surface-l4 border border-theme-subtle focus:border-accent rounded-md p-4 text-theme-primary text-input-placeholder outline-none transition-all resize-none leading-relaxed"
                />
                {jsonText && (
                  <div className="text-[11px] font-mono text-theme-tertiary text-right pr-1">
                    {lineCount} lines · {byteSize} KB
                  </div>
                )}
              </div>
            )}

            {tab === "upload" && (
              <div className="p-8 rounded-md text-center bg-surface-l4/60 hover:bg-surface-l4 transition-colors cursor-pointer relative group">
                <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Upload className="w-7 h-7 text-theme-tertiary group-hover:text-accent transition-colors mx-auto mb-2" />
                <div className="text-[14px] font-semibold text-theme-primary">
                  {jsonText ? "File loaded into editor" : "Click to select a .json file"}
                </div>
                <div className="text-[12px] text-theme-secondary mt-1">Project or board JSON files</div>
              </div>
            )}

            {tab === "template" && (
              <TemplatePanel
                promptText={promptText}
                onPromptChange={setPromptText}
                copiedFlag={copiedFlag}
                onCopy={copyText}
              />
            )}

            {tab !== "template" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px]">
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="px-2.5 py-1 rounded-md bg-accent-subtle hover:opacity-80 text-accent font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste Clipboard</span>
                  </button>

                  {jsonText && (
                    <>
                      <button
                        type="button"
                        onClick={handleFormatJson}
                        className="px-2.5 py-1 rounded-md bg-surface-l4 hover:bg-surface-hover text-theme-secondary hover:text-theme-primary flex items-center gap-1 transition-colors cursor-pointer"
                        title="Prettify JSON"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Format</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setJsonText("");
                          setError(null);
                        }}
                        className="p-1.5 rounded-md text-theme-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Clear text"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {mode === "replace" && jsonText && (
                  <span className="text-[11px] text-theme-tertiary">
                    Preview will show exactly what changes on the board
                  </span>
                )}
              </div>
            )}

            {error && (
              <div className="text-[13px] text-semantic-danger bg-semantic-danger-subtle p-3 rounded-md font-medium">
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-[14px] font-medium text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={!jsonText.trim()}
                className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-on-accent text-[14px] font-semibold rounded-md transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {mode === "replace" ? (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Preview on board</span>
                  </>
                ) : (
                  <>
                    <span>Preview</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          parsed && <CreateSummary parsed={parsed} />
        )}
      </div>

      {step === "preview" && parsed && (
        <div className="pt-2 flex items-center justify-between gap-3">
          {error && (
            <div className="flex-1 text-[12.5px] text-semantic-danger bg-semantic-danger-subtle p-2.5 rounded-md font-medium">
              {error}
            </div>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={() => setStep("input")}
              className="px-4 py-2 rounded-md text-[14px] font-medium text-theme-secondary hover:text-theme-primary flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isImporting}
              className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-on-accent text-[14px] font-semibold rounded-md transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <span>{isImporting ? "Creating…" : "Create project"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </ModalContainer>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
        active ? "bg-surface-l2 text-theme-primary shadow-xs" : "text-theme-secondary hover:text-theme-primary"
      )}
    >
      {children}
    </button>
  );
}

function TemplatePanel({
  promptText,
  onPromptChange,
  copiedFlag,
  onCopy,
}: {
  promptText: string;
  onPromptChange: (value: string) => void;
  copiedFlag: CopiedFlag;
  onCopy: (text: string, flag: CopiedFlag) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono text-theme-tertiary uppercase tracking-wide">
            AI prompt · editable
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPromptChange(IMPORT_AI_PROMPT)}
              className="px-2 py-1 rounded-md text-[11.5px] font-medium bg-surface-l4 hover:bg-surface-hover text-theme-tertiary hover:text-theme-primary flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset prompt to default"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <SmallCopyButton
              label={copiedFlag === "prompt" ? "Copied" : "Copy"}
              copied={copiedFlag === "prompt"}
              onClick={() => onCopy(promptText, "prompt")}
            />
          </div>
        </div>
        <textarea
          rows={7}
          value={promptText}
          onChange={(e) => onPromptChange(e.target.value)}
          className="w-full font-mono text-[11.5px] bg-surface-l4 focus:bg-surface-l4 border border-theme-subtle focus:border-accent rounded-md p-3.5 text-theme-primary text-input-placeholder outline-none transition-all resize-none leading-relaxed"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono text-theme-tertiary uppercase tracking-wide">
            Example JSON
          </label>
          <SmallCopyButton
            label={copiedFlag === "example" ? "Copied" : "Copy"}
            copied={copiedFlag === "example"}
            onClick={() => onCopy(IMPORT_AI_EXAMPLE, "example")}
          />
        </div>
        <pre className="p-3.5 bg-surface-l4 rounded-md max-h-[180px] overflow-y-auto font-mono text-[11px] whitespace-pre leading-relaxed text-theme-primary selection:bg-accent">
          {IMPORT_AI_EXAMPLE}
        </pre>
      </div>

      <button
        type="button"
        onClick={() => onCopy(buildAiPromptWithExample(), "both")}
        className="w-full py-2.5 rounded-md bg-brand-accent hover:bg-brand-accent-hover text-on-accent text-[13px] font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
      >
        {copiedFlag === "both" ? <Check className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
        <span>{copiedFlag === "both" ? "Copied — paste it into your AI" : "Copy prompt + example"}</span>
      </button>
      <p className="text-[11.5px] text-theme-tertiary leading-relaxed">
        Paste this into an AI assistant, get JSON back, then switch to <span className="text-theme-secondary font-medium">Paste Code</span> to import it.
      </p>
    </div>
  );
}

function SmallCopyButton({
  label,
  copied,
  onClick,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2 py-1 rounded-md text-[11.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer",
        copied
          ? "bg-semantic-success-subtle text-semantic-success"
          : "bg-surface-l3 hover:bg-surface-l4 border border-theme-subtle text-theme-secondary hover:text-theme-primary"
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label}
    </button>
  );
}

function CreateSummary({ parsed }: { parsed: ParsedImport }) {
  const totalTasks = parsed.columns.reduce((sum, column) => sum + column.tasks.length, 0);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-md border border-accent bg-accent-subtle space-y-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
              parsed.kind === "project" ? "bg-accent-subtle text-accent" : "bg-surface-l3 text-theme-secondary"
            )}
          >
            {parsed.kind === "project" ? <Layers className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-theme-primary truncate">
              {parsed.kind === "project" ? parsed.name ?? "Untitled project" : "Board only (no metadata)"}
            </div>
            <div className="text-[11.5px] text-theme-tertiary font-mono uppercase tracking-wide">
              {parsed.kind} · {parsed.columns.length} column{parsed.columns.length === 1 ? "" : "s"} · {totalTasks} task
              {totalTasks === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {parsed.kind === "project" && (parsed.description || parsed.color || parsed.icon) && (
          <div className="text-[12px] text-theme-secondary leading-relaxed">
            {parsed.description ? <p>{parsed.description}</p> : null}
            {(parsed.color || parsed.icon) && (
              <p className="text-[11px] font-mono text-theme-tertiary mt-1">
                {parsed.icon ? `${parsed.icon} ` : ""}
                {parsed.color ? `#${parsed.color.replace("#", "")}` : ""}
              </p>
            )}
          </div>
        )}

        {parsed.columns.length > 0 && (
          <div className="max-h-[180px] overflow-y-auto space-y-1 pr-1">
            {parsed.columns.map((column, index) => (
              <div
                key={`${column.name}-${index}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-surface-l2 border border-theme-subtle"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: column.color || "#6B7280" }}
                />
                <span className="text-[12.5px] font-medium text-theme-primary truncate flex-1">{column.name}</span>
                <span className="text-[11px] font-mono text-theme-tertiary shrink-0">
                  {column.tasks.length} task{column.tasks.length === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[12px] text-theme-tertiary leading-relaxed">
        A new project will be created. All ids are generated by the backend — nothing from the JSON is reused.
      </p>
    </div>
  );
}
