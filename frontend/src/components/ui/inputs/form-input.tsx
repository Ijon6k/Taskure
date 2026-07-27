"use client";

import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

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

export interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | undefined;
  options?: Array<{ label: string; value: string }>;
  children?: React.ReactNode;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, options, children, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[12px] font-mono font-medium text-theme-tertiary uppercase tracking-wider block">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            className={`w-full appearance-none bg-surface-l3 border border-theme-subtle rounded-md pl-3.5 pr-9 py-2 text-[14px] font-medium text-theme-primary outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all cursor-pointer ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-surface-l4 text-theme-primary">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="w-4 h-4 text-theme-tertiary absolute right-3 pointer-events-none" />
        </div>
        {error && <p className="text-[13px] text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);
FormSelect.displayName = "FormSelect";
