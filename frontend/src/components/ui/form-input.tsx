"use client";

import React, { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function FormInput({
  label,
  error,
  className = "",
  ...props
}: FormInputProps) {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px] block">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-theme-elevated border border-theme-default rounded-[6px] px-3 py-2 text-[14px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-[12px] text-red-400 font-medium">{error}</p>}
    </div>
  );
}

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function FormTextarea({
  label,
  error,
  className = "",
  rows = 3,
  ...props
}: FormTextareaProps) {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px] block">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`w-full bg-theme-elevated border border-theme-default rounded-[6px] p-3 text-[14px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent transition-colors resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-[12px] text-red-400 font-medium">{error}</p>}
    </div>
  );
}
