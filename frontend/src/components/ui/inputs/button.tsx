"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-accent disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer active:scale-[0.98] duration-100",
  {
    variants: {
      variant: {
        default: "bg-brand-accent text-black hover:bg-brand-accent-hover font-semibold shadow-xs",
        primary: "bg-brand-accent text-black hover:bg-brand-accent-hover font-semibold shadow-xs",
        secondary: "bg-surface-l3 hover:bg-surface-l4 border border-theme-subtle text-theme-primary",
        outline: "bg-transparent border border-theme-default hover:bg-surface-hover text-theme-primary",
        ghost: "bg-transparent hover:bg-surface-hover text-theme-secondary hover:text-theme-primary",
        danger: "bg-semantic-danger text-white hover:opacity-90 shadow-xs",
        link: "text-brand-accent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        md: "h-9 px-3.5 py-2",
        sm: "h-7 px-2.5 py-1 text-[12px]",
        lg: "h-10 px-5 py-2.5 text-[14px]",
        icon: "h-9 w-9 p-0 flex items-center justify-center",
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
