"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-brand-accent select-none",
  {
    variants: {
      variant: {
        default: "border-theme-subtle bg-surface-l3 text-theme-primary",
        secondary: "border-theme-subtle bg-surface-l2 text-theme-secondary",
        accent: "border-brand-accent/30 bg-brand-accent/15 text-brand-accent font-semibold",
        danger: "border-semantic-danger/30 bg-semantic-danger/15 text-semantic-danger font-semibold",
        success: "border-semantic-success/30 bg-semantic-success/15 text-semantic-success font-semibold",
        warning: "border-semantic-warning/30 bg-semantic-warning/15 text-semantic-warning font-semibold",
        outline: "border-theme-default text-theme-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
