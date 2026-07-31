"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProjectDefaultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id || "";

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/board`);
    }
  }, [projectId, router]);

  return null;
}
