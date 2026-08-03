"use client";

import { useParams, useRouter } from "next/navigation";
import { useProject } from "@/lib/api";
import { ProjectResourcesTab } from "@/components/features/project/project-resources-tab";

/** Asset explorer page: resource/attachment grid with search, edit and upload. */
export default function ProjectResourcesPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";
  const router = useRouter();

  const { data: project, refetch } = useProject(projectId);

  return (
    <ProjectResourcesTab
      project={project || null}
      onRefreshProject={refetch}
      onOpenTask={() => router.push(`/projects/${projectId}/board`)}
    />
  );
}
