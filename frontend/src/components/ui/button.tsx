"use client";

import React, { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-[6px] cursor-pointer transition-all duration-150 active:scale-[0.98] select-none disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

  const sizeClasses = {
    sm: "px-2.5 py-1 text-[12px]",
    md: "px-3 py-1.5 text-[13px]",
    lg: "px-4 py-2 text-[14px]",
  };

  const variantClasses = {
    primary: "bg-[#7F9CF5] hover:bg-[#6B89E3] text-black shadow-xs",
    secondary: "bg-theme-elevated hover:bg-theme-hover border border-theme-default text-theme-primary",
    ghost: "bg-transparent hover:bg-theme-elevated text-theme-secondary hover:text-theme-primary",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-xs",
    outline: "bg-transparent border border-theme-default hover:border-brand-accent/40 text-theme-primary hover:bg-theme-hover",
  };

  return (
    <button
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
