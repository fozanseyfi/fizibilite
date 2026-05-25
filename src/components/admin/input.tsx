"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const baseClasses =
  "w-full px-3.5 h-10 rounded-lg bg-white border border-border2 text-text text-sm transition-all " +
  "focus:outline-none focus:border-accent focus:shadow-focus " +
  "placeholder:text-text3 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-bg2";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(baseClasses, props.type === "number" && "font-mono tabular-nums", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(baseClasses, "min-h-[88px] h-auto py-2.5 resize-y", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(baseClasses, "cursor-pointer pr-9 appearance-none bg-no-repeat", className)}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M10 14a1 1 0 01-.71-.29l-4-4a1 1 0 011.42-1.42L10 11.59l3.29-3.3a1 1 0 011.42 1.42l-4 4A1 1 0 0110 14z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundPosition: "right 0.6rem center",
        backgroundSize: "1.1rem",
      }}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-[12px] font-semibold text-text2 mb-1.5 tracking-tight", className)} {...props}>
      {children}
    </label>
  );
}

export function Field({ label, hint, className, children }: { label?: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <span className="text-[11px] text-text3 mt-1">{hint}</span>}
    </div>
  );
}
