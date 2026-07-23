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
      className={`h-[36px] px-3 bg-theme-surface border border-theme-default rounded-[6px] flex items-center gap-2.5 ${className}`}
    >
      <Search className="w-[15px] h-[15px] text-theme-secondary shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[14px] text-theme-primary placeholder-theme-secondary outline-none"
      />
    </div>
  );
}
