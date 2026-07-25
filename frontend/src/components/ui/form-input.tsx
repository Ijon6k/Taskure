"use client";

import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1 w-full">
        {label && (
          <label className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px] block">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-theme-elevated border border-theme-default rounded-md px-3 py-2 text-[14px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent transition-colors ${className}`}
          {...props}
        />
        {error && <p className="text-[12px] text-red-400 font-medium">{error}</p>}
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
      <div className="space-y-1 w-full">
        {label && (
          <label className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px] block">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`w-full bg-theme-elevated border border-theme-default rounded-md p-3 text-[14px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent transition-colors resize-none ${className}`}
          {...props}
        />
        {error && <p className="text-[12px] text-red-400 font-medium">{error}</p>}
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
      <div className="space-y-1 w-full">
        {label && (
          <label className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.5px] block">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full bg-theme-elevated border border-theme-default rounded-md px-3 py-2 text-[14px] text-theme-primary focus:outline-none focus:border-brand-accent transition-colors cursor-pointer ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="text-[12px] text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);
FormSelect.displayName = "FormSelect";
