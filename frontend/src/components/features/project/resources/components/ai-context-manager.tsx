"use client";

import { useEffect, useState } from "react";
import { Plus, Code, Database, BookOpen, Trash2, CheckCircle2, FileText } from "lucide-react";
import { ProjectContextData } from "@/lib/api";
import { toast } from "sonner";

interface AiContextManagerProps {
  projectId: string;
  contexts?: ProjectContextData[] | undefined;
}

export function AiContextManager({
  projectId,
  contexts = [],
}: AiContextManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("api_spec");
  const [docContent, setDocContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const storageKey = `kanban_ai_context_${projectId}`;

  const [docList, setDocList] = useState<ProjectContextData[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore parsing error
        }
      }
    }
    return contexts.length > 0 ? contexts : [];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setDocList(JSON.parse(saved));
          return;
        } catch {
          // ignore parsing error
        }
      }
    }
    setDocList(contexts.length > 0 ? contexts : []);
  }, [projectId, storageKey]);

  const saveToLocal = (docs: ProjectContextData[]) => {
    setDocList(docs);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(docs));
    }
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;

    setIsSaving(true);
    const newDoc: ProjectContextData = {
      id: "ctx-" + Date.now(),
      title: docTitle.trim(),
      content: docContent.trim(),
      context_type: docType,
      project_id: projectId,
      created_at: new Date().toISOString(),
    };

    try {
      await fetch("/api/ai/rag/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `${docTitle.trim()}: ${docContent.trim()}`,
          project_id: projectId,
          context_type: "project",
          metadata: { title: docTitle.trim(), doc_type: docType },
        }),
      }).catch(() => {
        // AI service optional
      });
    } catch {
      // offline fallback
    }

    const updated = [newDoc, ...docList];
    saveToLocal(updated);
    setDocTitle("");
    setDocContent("");
    setIsAdding(false);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    toast.success("Document added to AI context!");
  };

  const handleDeleteDoc = (id: string) => {
    const updated = docList.filter((d) => d.id !== id);
    saveToLocal(updated);
    toast.success("Document removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="section-title !mb-0">Project Documentation &amp; Specs</h3>
          <p className="text-[12px] text-theme-tertiary pt-0.5">
            Technical documentations, specifications, and schema notes for this project.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1.5 bg-brand-accent text-on-accent text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Document</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-semantic-success-subtle border border-semantic-success/30 rounded-md text-[13px] text-semantic-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Document successfully saved to project resources!</span>
        </div>
      )}

      {/* Add Context Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateDoc}
          className="p-4 bg-surface-l3 border border-theme-subtle rounded-md space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-accent" />
            <span className="text-sm font-medium text-theme-primary">
              Add Project Document
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Document title..."
                className="document-input text-sm"
                required
              />
            </div>
            <div>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="document-input text-sm cursor-pointer"
              >
                <option value="api_spec">API Specification</option>
                <option value="database_schema">Database Schema</option>
                <option value="architecture">Architecture Note</option>
                <option value="requirement">Requirements</option>
              </select>
            </div>
          </div>

          <textarea
            rows={5}
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            placeholder="Write the document content here..."
            className="document-textarea font-mono text-[13px]"
            required
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-[13px] text-theme-secondary hover:text-theme-primary rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !docTitle.trim() || !docContent.trim()}
              className="px-4 py-1.5 bg-brand-accent text-on-accent text-[13px] font-medium rounded-md disabled:opacity-40 flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : (
                <span>Save Document</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Documents List */}
      <div className="space-y-1">
        {docList.map((doc) => (
          <div
            key={doc.id}
            className="interactive-row p-3 flex items-start justify-between gap-4 group"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2.5">
                {getContextTypeIcon(doc.context_type)}
                <h4 className="text-[14px] font-medium text-theme-primary group-hover:text-brand-accent transition-colors truncate">
                  {doc.title}
                </h4>
                <span className="text-[10px] text-theme-tertiary uppercase tracking-wider font-mono shrink-0">
                  {doc.context_type.replace("_", " ")}
                </span>
              </div>
              <p className="text-[13px] text-theme-secondary leading-relaxed line-clamp-2">
                {doc.content}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleDeleteDoc(doc.id)}
              className="p-1.5 text-theme-tertiary hover:text-semantic-danger opacity-0 group-hover:opacity-100 transition-opacity rounded shrink-0 cursor-pointer"
              title="Delete document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Picks the icon for an AI context type. */
function getContextTypeIcon(type: string) {
  switch (type) {
    case "api_spec":
      return <Code className="w-4 h-4 text-brand-accent shrink-0" />;
    case "database_schema":
      return <Database className="w-4 h-4 text-semantic-success shrink-0" />;
    default:
      return <BookOpen className="w-4 h-4 text-semantic-warning shrink-0" />;
  }
}
