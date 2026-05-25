"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "ghost" | "danger" | "outline" | "soft";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  accent: "bg-accent text-white hover:bg-accent2 active:bg-accent2 shadow-soft hover:shadow-medium",
  primary: "bg-blue text-white hover:bg-blue2 active:bg-blue2 shadow-soft hover:shadow-medium",
  soft: "bg-accent/10 text-accent hover:bg-accent/15",
  outline: "bg-white text-text border border-border2 hover:bg-bg2 hover:border-text3",
  ghost: "bg-transparent text-text2 hover:bg-bg3 hover:text-text",
  danger: "bg-red text-white hover:bg-red/90 shadow-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-11 px-5 text-sm rounded-xl",
  icon: "h-9 w-9 p-0 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-all duration-150",
        "disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:shadow-focus",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
