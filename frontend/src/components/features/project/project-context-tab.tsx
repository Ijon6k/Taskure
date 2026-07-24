"use client";

import { useState } from "react";
import { FileCode, Plus, Sparkles, BookOpen, Database, Code, Trash2, CheckCircle2 } from "lucide-react";
import { ProjectContextData } from "@/lib/api";

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

  // Mock initial demo contexts if none passed
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
    <div className="flex-1 overflow-y-auto p-8 text-[14px]">
      <div className="max-w-[840px] mx-auto space-y-8 font-sans">
        {/* Header & Overview Banner */}
        <div className="p-6 bg-theme-surface border border-theme-default rounded-[10px] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[8px] bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-brand-accent" />
              </div>
              <div>
                <h2 className="text-[16px] font-medium text-theme-primary">AI RAG Knowledge Context</h2>
                <p className="text-[12px] text-theme-secondary">
                  Dokumen konteks yang diindeks ke PgVector untuk mendukung kecerdasan buatan (AI assistant).
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3.5 py-1.5 bg-brand-accent text-black text-[13px] font-medium rounded-[6px] hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Context Doc</span>
            </button>
          </div>

          {indexedSuccess && (
            <div className="p-3 bg-semantic-success-subtle border border-semantic-success/30 rounded-[6px] text-[13px] text-semantic-success flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Dokumen berhasil diindeks ke dalam PgVector AI RAG pipeline!</span>
            </div>
          )}
        </div>

        {/* Add Context Form */}
        {isAdding && (
          <form onSubmit={handleCreateDoc} className="p-5 bg-theme-elevated border border-theme-default rounded-[10px] space-y-4 animate-in fade-in">
            <h3 className="text-[14px] font-medium text-theme-primary flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-accent" />
              <span>Tambah Dokumen Konteks Pengetahuan</span>
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-[12px] text-theme-secondary">Judul Dokumen</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Misal: System Architecture Overview..."
                  className="w-full bg-theme-surface border border-theme-default rounded-[6px] px-3 py-1.5 text-[13px] text-theme-primary outline-none focus:border-brand-accent"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] text-theme-secondary">Tipe Konteks</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-theme-surface border border-theme-default rounded-[6px] px-3 py-1.5 text-[13px] text-theme-primary outline-none focus:border-brand-accent"
                >
                  <option value="api_spec">API Specification</option>
                  <option value="database_schema">Database Schema</option>
                  <option value="architecture">Architecture Note</option>
                  <option value="requirement">Requirements Document</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] text-theme-secondary">Isi Konten Dokumen (Markdown / Plain Text)</label>
              <textarea
                rows={5}
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Tuliskan detail OpenAPI spec, skema DB, atau instruksi arsitektur di sini..."
                className="w-full bg-theme-surface border border-theme-default rounded-[6px] p-3 text-[13px] text-theme-primary outline-none focus:border-brand-accent resize-none font-mono"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-[13px] text-theme-secondary hover:text-theme-primary rounded"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isIndexing || !docTitle.trim() || !docContent.trim()}
                className="px-4 py-1.5 bg-brand-accent text-black text-[13px] font-medium rounded-[6px] disabled:opacity-40 flex items-center gap-2"
              >
                {isIndexing ? (
                  <span>Mengindeks...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Indeks ke AI RAG</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Documents List */}
        <div className="space-y-3">
          <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.6px]">
            Indexed Context Documents ({docList.length})
          </div>

          <div className="space-y-3">
            {docList.map((doc) => (
              <div
                key={doc.id}
                className="p-5 bg-theme-surface border border-theme-default hover:border-theme-secondary rounded-[10px] space-y-3 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {getTypeIcon(doc.context_type)}
                    <h4 className="text-[15px] font-medium text-theme-primary group-hover:text-brand-accent transition-colors">
                      {doc.title}
                    </h4>
                    <span className="px-2 py-0.5 bg-theme-elevated border border-theme-subtle rounded-[4px] text-[11px] text-theme-secondary uppercase tracking-[0.4px]">
                      {doc.context_type.replace("_", " ")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-1.5 text-theme-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    title="Hapus dokumen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[13px] text-theme-secondary leading-relaxed font-mono bg-theme-elevated/60 p-3 rounded-[6px] border border-theme-subtle whitespace-pre-wrap">
                  {doc.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
