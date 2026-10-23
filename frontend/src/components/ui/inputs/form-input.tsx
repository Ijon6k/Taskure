"use client";

import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./select";

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[12px] font-mono font-medium text-theme-tertiary uppercase tracking-wider block">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-surface-l3 border border-theme-subtle rounded-md px-3.5 py-2 text-[14px] text-theme-primary placeholder-theme-tertiary outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all ${className}`}
          {...props}
        />
        {error && <p className="text-[13px] text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | undefined;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, className = "", rows = 3, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[12px] font-mono font-medium text-theme-tertiary uppercase tracking-wider block">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`w-full bg-surface-l3 border border-theme-subtle rounded-md p-3.5 text-[14px] text-theme-primary placeholder-theme-tertiary outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all resize-none ${className}`}
          {...props}
        />
        {error && <p className="text-[13px] text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);
FormTextarea.displayName = "FormTextarea";

export interface FormSelectProps {
  label?: string | undefined;
  error?: string | undefined;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  options: Array<{ label: string; value: string }>;
  className?: string | undefined;
  disabled?: boolean | undefined;
}

export function FormSelect({
  label,
  error,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  options,
  className = "",
  disabled,
}: FormSelectProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-[11px] font-mono font-medium text-theme-tertiary uppercase tracking-wider block">
          {label}
        </label>
      )}
      <Select
        {...(value !== undefined ? { value } : {})}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        {...(onValueChange !== undefined ? { onValueChange } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
      >
        <SelectTrigger className={`w-full ${className}`}>
          {placeholder ? <SelectValue placeholder={placeholder} /> : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-[12px] text-red-400 font-medium">{error}</p>}
    </div>
  );
}
