"use client";

import { getPriorityConfig } from "@/lib/helpers";

interface PriorityBadgeProps {
  priority?: string | undefined;
  showLabel?: boolean | undefined;
  className?: string | undefined;
}

export function RankInsigniaIcon({
  priority,
  className = "w-3.5 h-3.5",
}: {
  priority?: string | undefined;
  className?: string | undefined;
}) {
  const p = (priority || "none").toLowerCase().trim();

  if (p === "urgent" || p === "critical") {
    return (
      <svg
        viewBox="0 0 14 14"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2 3.5C2 2.67157 2.67157 2 3.5 2H10.5C11.3284 2 12 2.67157 12 3.5V10.5C12 11.3284 11.3284 12 10.5 12H3.5C2.67157 12 2 11.3284 2 10.5V3.5ZM6.25 4C6.25 3.58579 6.58579 3.25 7 3.25C7.41421 3.25 7.75 3.58579 7.75 4V7.5C7.75 7.91421 7.41421 8.25 7 8.25C6.58579 8.25 6.25 7.91421 6.25 7.5V4ZM7 10.25C7.55228 10.25 8 9.80228 8 9.25C8 8.69772 7.55228 8.25 7 8.25C6.44772 8.25 6 8.69772 6 9.25C6 9.80228 6.44772 10.25 7 10.25Z"
        />
      </svg>
    );
  }

  if (p === "high") {
    return (
      <svg
        viewBox="0 0 14 14"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <rect x="2" y="8" width="2.5" height="4" rx="0.75" />
        <rect x="5.75" y="5" width="2.5" height="7" rx="0.75" />
        <rect x="9.5" y="2" width="2.5" height="10" rx="0.75" />
      </svg>
    );
  }

  if (p === "medium") {
    return (
      <svg
        viewBox="0 0 14 14"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <rect x="2" y="8" width="2.5" height="4" rx="0.75" />
        <rect x="5.75" y="5" width="2.5" height="7" rx="0.75" />
        <rect x="9.5" y="2" width="2.5" height="10" rx="0.75" opacity="0.25" />
      </svg>
    );
  }

  if (p === "low") {
    return (
      <svg
        viewBox="0 0 14 14"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <rect x="2" y="8" width="2.5" height="4" rx="0.75" />
        <rect x="5.75" y="5" width="2.5" height="7" rx="0.75" opacity="0.25" />
        <rect x="9.5" y="2" width="2.5" height="10" rx="0.75" opacity="0.25" />
      </svg>
    );
  }

  // none / default
  return (
    <svg
      viewBox="0 0 14 14"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="3.25" cy="10" r="1.25" opacity="0.4" />
      <circle cx="7" cy="10" r="1.25" opacity="0.4" />
      <circle cx="10.75" cy="10" r="1.25" opacity="0.4" />
    </svg>
  );
}

export function PriorityBadge({
  priority,
  showLabel = false,
  className = "",
}: PriorityBadgeProps) {
  const config = getPriorityConfig(priority);

  if (config.id === "none") {
    return null;
  }

  return (
    <span
      title={`Priority: ${config.label}`}
      className={`inline-flex items-center gap-1 text-[11px] font-medium select-none shrink-0 ${className}`}
      style={{ color: config.color }}
    >
      <RankInsigniaIcon priority={config.id} className="w-3.5 h-3.5 shrink-0" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
