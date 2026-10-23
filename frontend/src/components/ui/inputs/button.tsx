"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-accent/40 disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer active:scale-[0.98] duration-100",
  {
    variants: {
      variant: {
        default: "bg-brand-accent text-white hover:bg-brand-accent-hover font-medium border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
        primary: "bg-brand-accent text-white hover:bg-brand-accent-hover font-medium border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
        secondary: "bg-surface-l2 hover:bg-surface-l3 border border-theme-subtle text-theme-primary shadow-xs",
        outline: "bg-transparent border border-theme-subtle hover:bg-surface-hover text-theme-secondary hover:text-theme-primary",
        ghost: "bg-transparent hover:bg-surface-hover text-theme-secondary hover:text-theme-primary",
        danger: "bg-semantic-danger/15 border border-semantic-danger/20 text-red-400 hover:bg-semantic-danger/25 shadow-xs",
        link: "text-brand-accent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-7 px-2.5 py-1 text-[12px]",
        sm: "h-6 px-2 py-0.5 text-[11px]",
        md: "h-8 px-3 py-1.5 text-[13px]",
        lg: "h-9 px-3.5 py-2 text-[13px]",
        icon: "h-7 w-7 p-0 flex items-center justify-center",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
