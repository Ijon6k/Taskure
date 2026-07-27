"use client";

import { useCallback } from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  id?: string;
}

const sizeConfig = {
  sm: { w: 38, h: 20, knob: 14 },
  md: { w: 48, h: 26, knob: 20 },
};

export function Toggle({
  checked,
  onChange,
  disabled = false,
  size = "md",
  id,
}: ToggleProps) {
  const { w, h, knob } = sizeConfig[size];
  const trackClasses = `rounded-full transition-colors duration-200 relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface-l3 ${
    disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
  } ${checked ? "bg-brand-accent" : "bg-surface-l3 border border-theme-subtle"}`;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onChange(!checked);
      }
    },
    [checked, disabled, onChange]
  );

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(!checked); }}
      onKeyDown={handleKeyDown}
      style={{ width: w, height: h }}
      className={trackClasses}
    >
      <span
        style={{
          width: knob,
          height: knob,
          top: (h - knob) / 2,
          left: checked ? w - knob - 3 : 3,
        }}
        className="absolute bg-white rounded-full shadow-sm transition-[left] duration-200"
      />
    </button>
  );
}
