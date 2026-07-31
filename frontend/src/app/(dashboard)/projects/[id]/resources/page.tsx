"use client";

import { useParams } from "next/navigation";
import { useProjectBoard } from "@/lib/api";
import { ProjectResourcesTab } from "@/components/features/project/project-resources-tab";

export default function ProjectResourcesPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";

  const { data: project, refetch } = useProjectBoard(projectId);

  return (
    <ProjectResourcesTab
      project={project || null}
      onRefreshProject={refetch}
    />
  );
}
