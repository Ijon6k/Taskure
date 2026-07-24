"use client";

import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: SearchInputProps) {
  return (
    <div
      className={`h-9 px-3 bg-theme-surface border border-theme-default rounded-md flex items-center gap-2.5 ${className}`}
    >
      <Search className="w-4 h-4 text-theme-secondary shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-theme-primary placeholder-theme-secondary outline-none"
      />
    </div>
  );
}
