"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";

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
      className={`flex items-center gap-2 ${className}`}
    >
      <MagnifyingGlass className="w-3.5 h-3.5 text-theme-tertiary shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[12px] md:text-[13px] text-theme-primary placeholder-theme-tertiary outline-none py-1"
      />
    </div>
  );
}
