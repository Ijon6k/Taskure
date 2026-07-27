"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ProjectData } from "@/lib/api";

interface RecentActivityProps {
  projects: ProjectData[];
  limit?: number;
}

function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export function RecentActivity({ projects, limit = 5 }: RecentActivityProps) {
  const recent = [...projects]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);

  if (recent.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {recent.map((project) => {
        const projectColor = project.color || "#7F9CF5";
        const time = relativeTime(project.updated_at);

        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}/board`}
            className="flex items-center gap-2.5 px-2 py-2.5 rounded-[6px] hover:bg-surface-hover/40 transition-colors group/act"
          >
            <span
              className="w-1.5 h-1.5 shrink-0"
              style={{ backgroundColor: projectColor }}
            />
            <span className="flex-1 text-[15px] text-theme-secondary group-hover/act:text-theme-primary transition-colors truncate">
              {project.name}
            </span>
            {time && (
              <span className="text-[13px] text-theme-tertiary shrink-0">
                {time}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
