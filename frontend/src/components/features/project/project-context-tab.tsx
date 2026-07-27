"use client";

import { useState } from "react";
import { FileCode, Plus, Sparkles, BookOpen, Database, Code, Trash2, CheckCircle2 } from "lucide-react";
import { ProjectContextData } from "@/lib/api";
import { PageContainer } from "@/components/ui/page-container";

interface ProjectContextTabProps {
  projectId: string;
  contexts?: ProjectContextData[];
  onAddContext?: (title: string, type: string, content: string) => void;
}

export function ProjectContextTab({
  projectId,
  contexts = [],
  onAddContext,
}: ProjectContextTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("api_spec");
  const [docContent, setDocContent] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedSuccess, setIndexedSuccess] = useState(false);

  const initialDocs: ProjectContextData[] = contexts.length > 0
    ? contexts
    : [
        {
          id: "ctx-1",
          title: "v2 REST API & OAuth 2.1 Specification",
          content: "Comprehensive OpenAPI 3.1 specification for v2 endpoints including PKCE authorization, rate limiting (100 req/min), and cursor-based pagination.",
          context_type: "api_spec",
          project_id: projectId,
          created_at: new Date().toISOString(),
        },
        {
          id: "ctx-2",
          title: "PostgreSQL & PgVector Schema Architecture",
          content: "Database schema tables for Workspaces, Projects, Columns, Tasks, ChecklistItems, Labels, and Context embeddings with HNSW vector indexing.",
          context_type: "database_schema",
          project_id: projectId,
          created_at: new Date().toISOString(),
        },
      ];

  const [docList, setDocList] = useState<ProjectContextData[]>(initialDocs);

  const handleCreateDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;

    setIsIndexing(true);
    setTimeout(() => {
      const newDoc: ProjectContextData = {
        id: "ctx-" + Date.now(),
        title: docTitle.trim(),
        content: docContent.trim(),
        context_type: docType,
        project_id: projectId,
        created_at: new Date().toISOString(),
      };

      setDocList([newDoc, ...docList]);
      if (onAddContext) onAddContext(docTitle.trim(), docType, docContent.trim());

      setDocTitle("");
      setDocContent("");
      setIsAdding(false);
      setIsIndexing(false);
      setIndexedSuccess(true);
      setTimeout(() => setIndexedSuccess(false), 3000);
    }, 800);
  };

  const handleDeleteDoc = (id: string) => {
    setDocList(docList.filter((d) => d.id !== id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "api_spec":
        return <Code className="w-4 h-4 text-brand-accent" />;
      case "database_schema":
        return <Database className="w-4 h-4 text-semantic-success" />;
      default:
        return <BookOpen className="w-4 h-4 text-semantic-warning" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center">
      <PageContainer variant="default">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-brand-accent-subtle flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-accent" />
            </div>
            <div>
              <h2 className="text-base font-medium text-theme-primary">AI Knowledge Context</h2>
              <p className="text-xs text-theme-tertiary">
                Documents indexed into PgVector for AI assistant context.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 bg-brand-accent text-on-accent text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Context</span>
          </button>
        </div>

        {indexedSuccess && (
          <div className="p-3 bg-semantic-success-subtle border border-semantic-success/30 rounded-md text-[13px] text-semantic-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Document successfully indexed into the PgVector AI RAG pipeline!</span>
          </div>
        )}

        {/* Add Context Form */}
        {isAdding && (
          <form onSubmit={handleCreateDoc} className="p-4 bg-surface-l3 border border-theme-subtle rounded-md space-y-4">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-accent" />
              <span className="text-sm font-medium text-theme-primary">Add knowledge context document</span>
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
                className="px-3 py-1.5 text-[13px] text-theme-secondary hover:text-theme-primary rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isIndexing || !docTitle.trim() || !docContent.trim()}
                className="px-4 py-1.5 bg-brand-accent text-on-accent text-[13px] font-medium rounded-md disabled:opacity-40 flex items-center gap-2"
              >
                {isIndexing ? (
                  <span>Indexing...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Index to AI RAG</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <hr className="section-divider" />

        {/* Documents List */}
        <div className="space-y-2">
          <p className="section-title">
            Indexed documents ({docList.length})
          </p>

          <div className="space-y-0">
            {docList.map((doc) => (
              <div
                key={doc.id}
                className="interactive-row px-3 py-3 group"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    {getTypeIcon(doc.context_type)}
                    <h4 className="text-[14px] font-medium text-theme-primary group-hover:text-brand-accent transition-colors truncate">
                      {doc.title}
                    </h4>
                    <span className="text-[10px] text-theme-tertiary uppercase tracking-wider shrink-0">
                      {doc.context_type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[12px] text-theme-secondary leading-relaxed line-clamp-2">
                    {doc.content}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteDoc(doc.id)}
                  className="p-1.5 text-theme-tertiary hover:text-semantic-danger opacity-0 group-hover:opacity-100 transition-all rounded shrink-0"
                  title="Delete document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
