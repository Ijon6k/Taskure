"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useAIConsoleStore } from "@/components/features/ai-console/store";

const AIConsole = dynamic(
  () => import("@/components/features/ai-console/ai-console").then((m) => m.AIConsole),
  { ssr: false }
);

export default function ProjectAIPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";
  const setProjectId = useAIConsoleStore((s) => s.setProjectId);

  useEffect(() => {
    if (projectId) {
      setProjectId(projectId);
    }
  }, [projectId, setProjectId]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <AIConsole />
    </div>
  );
}
