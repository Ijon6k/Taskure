"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";

export default function ProjectDefaultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getProjectNavUrl } = useTheme();
  const projectId = params?.id || "";

  useEffect(() => {
    if (projectId) {
      router.replace(getProjectNavUrl(projectId));
    }
  }, [projectId, router, getProjectNavUrl]);

  return null;
}
