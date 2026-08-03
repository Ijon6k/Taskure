"use client";

import { useParams } from "next/navigation";
import { NotebookTab } from "@/components/features/notebook/notebook-tab";

/** Notebook tab route: markdown pages per project. */
export default function ProjectNotebookPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";

  return <NotebookTab projectId={projectId} />;
}
