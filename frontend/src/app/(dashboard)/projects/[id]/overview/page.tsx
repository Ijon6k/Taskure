"use client";

import { useParams, useRouter } from "next/navigation";
import { useProjectOverview } from "@/lib/api";
import { ProjectOverviewTab } from "@/components/features/project/project-overview-tab";

/** Overview page: columns + light tasks, meta, resources and tags sections. */
export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || "";
  const router = useRouter();

  const { data: project, refetch } = useProjectOverview(projectId);

  return (
    <ProjectOverviewTab
      project={project || null}
      onRefreshProject={refetch}
      onSwitchTab={(target: "board" | "resources") => router.push(`/projects/${projectId}/${target}`)}
      onOpenTask={() => router.push(`/projects/${projectId}/board`)}
    />
  );
}
