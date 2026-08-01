"use client";

import React, { ButtonHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<any>;
  variant?: "ghost" | "secondary" | "danger";
  size?: "sm" | "md";
  title?: string;
}

export function IconButton({
  icon: Icon,
  variant = "ghost",
  size = "md",
  title,
  className = "",
  disabled,
  ...props
}: IconButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md cursor-pointer transition-all duration-150 active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "w-7 h-7 p-1",
    md: "w-8 h-8 p-1.5",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
  };

  const variantClasses = {
    ghost: "text-theme-secondary hover:text-theme-primary hover:bg-theme-hover",
    secondary: "bg-theme-surface hover:bg-theme-hover text-theme-primary border border-theme-default",
    danger: "text-red-400 hover:text-red-300 hover:bg-red-500/10",
  };

  return (
    <button
      title={title}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </button>
  );
}
