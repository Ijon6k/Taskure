"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ProjectSummaryData } from "@/lib/api";
import { useTheme } from "@/components/providers/theme-provider";

interface RecentActivityProps {
  projects: ProjectSummaryData[];
  limit?: number;
  loading?: boolean;
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export function RecentActivity({ projects, limit = 5, loading }: RecentActivityProps) {
  const { getProjectNavUrl } = useTheme();

  if (loading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5 py-2.5 px-2 animate-pulse">
            <div className="w-1.5 h-1.5 bg-surface-hover rounded-full" />
            <div className="flex-1 h-4 bg-surface-hover rounded" />
            <div className="w-16 h-3 bg-surface-hover rounded" />
          </div>
        ))}
      </div>
    );
  }

  const recent = [...projects]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);

  if (recent.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {recent.map((project) => {
        const projectColor = project.color || "#7F9CF5";
        const time = relativeTime(project.updated_at);
        const navUrl = getProjectNavUrl(project.id);

        return (
          <Link
            key={project.id}
            href={navUrl}
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-md hover:bg-surface-hover transition-colors group/act cursor-pointer"
          >
            <span
              className="w-1.5 h-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: projectColor }}
            />
            <span className="flex-1 text-[14px] text-theme-secondary group-hover/act:text-theme-primary transition-colors truncate">
              {project.name}
            </span>
            {time && (
              <span className="text-[13px] text-theme-tertiary shrink-0 font-mono">
                {time}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
