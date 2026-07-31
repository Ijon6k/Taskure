"use client";

import { useParams, useRouter } from "next/navigation";
import { useProjectBoard } from "@/lib/api";
import { ProjectOverviewTab } from "@/components/features/project/project-overview-tab";

export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";
  const router = useRouter();

  const { data: project, refetch } = useProjectBoard(projectId);

  return (
    <ProjectOverviewTab
      project={project || null}
      onRefreshProject={refetch}
      onSwitchTab={(target: "board" | "resources") => router.push(`/projects/${projectId}/${target}`)}
    />
  );
}
