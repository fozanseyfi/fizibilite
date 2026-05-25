import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "green" | "yellow" | "red" | "blue" | "purple" | "accent" | "gray";

const variants: Record<Variant, string> = {
  green:  "bg-green/10 text-green",
  yellow: "bg-yellow/10 text-yellow",
  red:    "bg-red/10 text-red",
  blue:   "bg-blue/10 text-blue",
  purple: "bg-purple/10 text-purple",
  accent: "bg-accent/10 text-accent",
  gray:   "bg-bg3 text-text2",
};

export function Badge({ className, variant = "gray", children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-tight", variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
