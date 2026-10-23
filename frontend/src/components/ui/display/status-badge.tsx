"use client";

interface StatusBadgeProps {
  status?: string | undefined;
  color?: string | undefined;
  className?: string | undefined;
}

export function StatusGlyphIcon({
  status = "todo",
  className = "w-3.5 h-3.5",
  color,
}: {
  status?: string | undefined;
  className?: string | undefined;
  color?: string | undefined;
}) {
  const s = status.toLowerCase().replace(/\s+/g, "_");

  if (s === "done" || s === "completed") {
    return (
      <svg
        viewBox="0 0 14 14"
        fill="currentColor"
        className={className}
        style={{ color: color || "#5cba86" }}
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="6" />
        <path
          d="M4.5 7L6.2 8.7L9.5 5.3"
          stroke="var(--surface-l0, #08090a)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  if (s === "in_progress" || s === "progress") {
    return (
      <svg
        viewBox="0 0 14 14"
        fill="none"
        className={className}
        style={{ color: color || "#f59e0b" }}
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7 1.75C9.8995 1.75 12.25 4.1005 12.25 7C12.25 9.8995 9.8995 12.25 7 12.25V1.75Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (s === "in_review" || s === "review") {
    return (
      <svg
        viewBox="0 0 14 14"
        fill="none"
        className={className}
        style={{ color: color || "#a98deb" }}
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7 1.75V12.25C4.1005 12.25 1.75 9.8995 1.75 7C1.75 4.1005 4.1005 1.75 7 1.75Z"
          fill="currentColor"
        />
        <path
          d="M7 1.75C9.8995 1.75 12.25 4.1005 12.25 7H7V1.75Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (s === "cancelled" || s === "canceled") {
    return (
      <svg
        viewBox="0 0 14 14"
        fill="none"
        className={className}
        style={{ color: color || "#62666d" }}
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
        <line x1="3.5" y1="10.5" x2="10.5" y2="3.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (s === "backlog") {
    return (
      <svg
        viewBox="0 0 14 14"
        fill="none"
        className={className}
        style={{ color: color || "#62666d" }}
        aria-hidden="true"
      >
        <circle
          cx="7"
          cy="7"
          r="5.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2.5 2"
        />
      </svg>
    );
  }

  // default / todo
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      style={{ color: color || "#8a8f98" }}
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function StatusBadge({
  status = "todo",
  color,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-l2 border border-theme-subtle text-theme-secondary text-[11px] font-medium capitalize select-none ${className}`}
    >
      <StatusGlyphIcon status={status} color={color} className="w-3.5 h-3.5 shrink-0" />
      <span>{status.replace(/_/g, " ")}</span>
    </span>
  );
}
